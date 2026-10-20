# Vision Expo – Dữ liệu gửi qua WebSocket

Tài liệu cho bên làm **app hiển thị / app nhận dữ liệu**. Vision Expo xử lý camera (đếm người, nhận diện đồ vật mang theo) và đẩy kết quả qua một WebSocket JSON. Dashboard web của Vision Expo chỉ để vận hành; màn hình chính do app của bạn hiển thị.

- Giao thức: WebSocket, mỗi message là **một object JSON** (UTF-8, text frame).
- Server → client: dữ liệu định kỳ + sự kiện. Client → server: lệnh điều khiển nhỏ (tuỳ chọn).
- Thời gian `ts`: Unix timestamp **giây** (số thực, đồng hồ máy chạy Vision Expo).
- Tọa độ: **chuẩn hóa 0–1** theo khung hình gốc của camera (`frame_size`), gốc ở góc trên trái.
- Phiên bản giao thức hiện tại: `1.0.0` (trường `version` trong `hello`). Trường mới có thể được **thêm** vào sau; client nên bỏ qua trường lạ.

## 1. Kết nối

```
ws://<IP-máy-Vision-Expo>:8000/ws?topics=status,people,events&cameras=camera_1,camera_2&token=XXXX
```

| Tham số | Bắt buộc | Ý nghĩa |
|---|---|---|
| `topics` | không | Các chủ đề muốn nhận, cách nhau dấu phẩy: `status`, `people`, `events`, `tracks`. Bỏ trống = mặc định của server (thường `status,events`). **Màn hình hiển thị người/đồ vật cần `people`.** |
| `cameras` | không | Chỉ nhận dữ liệu của các camera này (id, cách nhau dấu phẩy). Bỏ trống = mọi camera |
| `token` | khi server có đặt | Token đặt ở trang `/socket` của dashboard. Sai token → server đóng kết nối mã `1008` |

Máy Vision Expo phải chạy với `--host 0.0.0.0` (bản Docker đã mặc định) và mở cổng 8000 trên firewall. Danh sách camera id: xem message `hello`, hoặc trang Cameras của dashboard.

### Trình tự

1. Client kết nối.
2. Server gửi `hello` (một lần).
3. Nếu có đăng ký `status`: server gửi ngay một `status`.
4. Sau đó: `status` và `people` theo chu kỳ, `events` / `tracks` khi xảy ra.

### Mã đóng kết nối

| Mã | Lý do |
|---|---|
| `1008` | Sai token |
| `1013` | WebSocket đang bị tắt trên server (thử lại sau) |
| `1001` | Server tắt / khởi động lại |
| khác / mất kết nối | Mạng, hoặc client nhận quá chậm (một lần gửi quá 2 giây thì server ngắt client đó) |

Client nên **tự kết nối lại** (chờ 1, 2, 4… tối đa 30 giây). Sự kiện xảy ra trong lúc mất kết nối không được gửi lại; nếu cần đủ dữ liệu, lấy bù qua REST (mục 6).

## 2. Chủ đề và tần suất

| Topic | Message `type` | Khi nào gửi | Mặc định |
|---|---|---|---|
| `status` | `status` | Định kỳ | 2 lần/giây (`status_hz`) |
| `people` | `people` | Định kỳ | 5 lần/giây (`people_hz`) |
| `events` | `crossing`, `alert`, `camera`, `reset` | Ngay khi xảy ra | – |
| `tracks` | `track` | Khi một người rời khung (3 giây không thấy) | – |

Tần suất chỉnh ở trang `/socket` (0–30 lần/giây, 0 = tắt). Vị trí người được cập nhật theo tốc độ xử lý camera (~15 khung/giây), đồ vật khoảng 5 lần/giây, nên `people_hz` trên 15 không có thêm thông tin.

## 3. Message server → client

### 3.1 `hello`

```json
{"type":"hello","client_id":3,"version":"1.0.0","server_time":1791877285.9,
 "topics":["events","people","status"],
 "available_topics":["status","people","events","tracks"],
 "cameras":[{"id":"camera_1","name":"Cổng chính","enabled":true},
            {"id":"camera_2","name":"Sảnh","enabled":false}]}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `client_id` | int | Id kết nối (hiện ở trang `/socket`) |
| `server_time` | float | Giờ server, dùng để bù lệch đồng hồ nếu cần |
| `topics` | string[] | Các topic client này đang nhận |
| `cameras` | object[] | Toàn bộ camera đã cấu hình (`enabled` = đang bật) |

### 3.2 `status` – số liệu tổng quan

```json
{"type":"status","ts":1791877285.9,
 "totals":{"persons":3,"inside":2,"outside":1,"entries":42,"exits":38,"objects":7,"alerts":0},
 "cameras":[{"id":"camera_1","name":"Cổng chính","status":"running","fps":14.9,
             "persons":3,"inside":2,"outside":1,"mode":"zone",
             "entries":42,"exits":38,"alerts":0,"objects":{"backpack":1,"glasses":2}}]}
```

Mỗi camera:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id`, `name` | string | Mã và tên camera |
| `status` | string | `running` (đang xử lý bình thường); `starting`, `loading model`, `connecting` (đang khởi động); `reconnecting`, `offline`, `error` (có sự cố); `disabled` (tắt trong cấu hình), `stopped` |
| `fps` | float \| null | Tốc độ xử lý hiện tại |
| `persons` | int | Số người **đang thấy** trong khung |
| `inside` | int \| null | Số người đang ở **trong vùng** (chế độ line: phía có điểm "trong"). `null` khi camera chưa vẽ line/vùng |
| `outside` | int \| null | Số người đang ở **ngoài vùng**. `null` như trên |
| `mode` | string | `"zone"` (vùng polygon) hoặc `"line"` |
| `entries`, `exits` | int | Tổng lượt vào / ra kể từ lần reset bộ đếm gần nhất |
| `alerts` | int | Số người đang bị cảnh báo vũ khí |
| `objects` | object | Đồ vật đang hiển thị: `{nhãn tiếng Anh: số lượng}` |

`persons − inside − outside` = người vừa xuất hiện, chưa xác định được phía. `totals` là tổng các camera đang chạy (cùng ý nghĩa).

### 3.3 `people` – từng người và đồ vật (dữ liệu chính để hiển thị)

```json
{"type":"people","ts":1791877286.1,
 "cameras":[{"id":"camera_1","frame_size":[1920,1080],
   "people":[{"track_id":27,"side":"in","alert":false,
              "items":["backpack","glasses"],
              "objects":[{"label":"backpack","vi":"ba lô","category":"bags","conf":0.82,"alert":false,
                          "box":[0.43,0.38,0.51,0.60]},
                         {"label":"glasses","vi":"kính mắt","category":"face","conf":0.71,"alert":false,
                          "box":[0.45,0.31,0.48,0.33]}],
              "conf":0.88,"box":[0.41,0.30,0.52,0.86],"foot":[0.47,0.85]}]}]}
```

Chỉ gồm camera đang chạy. Mỗi camera: `id`, `frame_size` (`[rộng, cao]` pixel của khung gốc), `people` (có thể rỗng).

Mỗi người:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `track_id` | int \| null | Mã theo dõi, giữ nguyên khi người đó còn trong khung. Duy nhất **trong một camera**, không liên kết giữa các camera; có thể đổi khi bị che khuất lâu; đánh lại từ đầu khi server khởi động lại. `null` hiếm gặp (chưa kịp gán) |
| `side` | string | `"in"` (trong vùng), `"out"` (ngoài vùng), `"unknown"` (chưa xác định / camera chưa vẽ line-vùng) |
| `alert` | bool | Đang mang vật thuộc nhóm vũ khí |
| `items` | string[] | Nhãn tiếng Anh các đồ vật đang mang (không trùng, sắp xếp) |
| `objects` | object[] | Chi tiết từng đồ vật (bảng dưới) |
| `conf` | float | Độ tin cậy phát hiện người (0–1) |
| `box` | float[4] | Khung người `[x1, y1, x2, y2]`, chuẩn hóa 0–1 |
| `foot` | float[2] | Điểm chân `[x, y]` (dùng để xét trong/ngoài vùng) |

Mỗi đồ vật trong `objects`:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `label` | string | Nhãn tiếng Anh (khóa ổn định để lập trình) |
| `vi` | string | Nhãn tiếng Việt để hiển thị |
| `category` | string | Nhóm (bảng ở mục 5) |
| `conf` | float | Độ tin cậy đã làm mượt (0–1), luôn ≥ ngưỡng hiển thị của server |
| `alert` | bool | Thuộc nhóm cảnh báo (vũ khí) |
| `box` | float[4] | Khung đồ vật `[x1, y1, x2, y2]`, chuẩn hóa 0–1 theo cùng khung hình |

Đồ vật trong `objects` đã được server lọc: chỉ những vật thấy ổn định qua nhiều lần quét, đủ ngưỡng hiển thị, không lẫn với tóc/quần áo. App không cần lọc thêm; danh sách này trùng với những gì dashboard vẽ trên khung hình.

Đổi sang pixel: `x_px = x * frame_size[0]`, `y_px = y * frame_size[1]`.

### 3.4 Sự kiện (`events`)

Mọi sự kiện có `type`, `ts`, `camera_id`.

**`crossing` – một lượt vào hoặc ra**

```json
{"type":"crossing","ts":1791877290.4,"camera_id":"camera_1","track_id":27,"direction":"in","mode":"zone"}
{"type":"crossing","ts":1791877332.9,"camera_id":"camera_1","track_id":27,"direction":"out","mode":"zone","dwell_s":42.5}
```

| Trường | Ý nghĩa |
|---|---|
| `direction` | `"in"` hoặc `"out"` |
| `mode` | `"line"` (qua đoạn thẳng) hoặc `"zone"` (vào/ra polygon) |
| `dwell_s` | Chỉ có khi ra khỏi vùng: số giây đã ở trong vùng |

Người đã đứng sẵn trong vùng lúc xuất hiện (mới khởi động, hoặc bị đổi `track_id`) được tính là đang ở trong (`side = "in"`) nhưng không phát sinh sự kiện vào.

**`alert` – phát hiện vũ khí**

```json
{"type":"alert","ts":1791877295.0,"camera_id":"camera_1","track_id":31,"items":["knife"],"all_items":["backpack","knife"]}
```

`items` = các vật thuộc nhóm vũ khí, `all_items` = mọi đồ vật người đó đang mang. Gửi khi vật được xác nhận (thấy ổn định qua nhiều lần quét), lặp lại tối đa **30 giây một lần** cho mỗi người nếu vẫn còn mang. Trạng thái tức thời xem `people[].alert`.

**`camera` – camera đổi trạng thái**

```json
{"type":"camera","ts":1791877300.0,"camera_id":"camera_2","status":"offline","error":"stream stalled"}
```

`status`: `online`, `offline`, `reconnecting`, `error`. `error` là mô tả lỗi hoặc `null`.

**`reset` – bộ đếm vào/ra của camera vừa được reset**

```json
{"type":"reset","ts":1791877400.0,"camera_id":"camera_1"}
```

### 3.5 `track` – tóm tắt một lượt người (topic `tracks`)

Gửi khi một người không còn thấy trong 3 giây. Lượt quá ngắn (dưới 5 khung) bị bỏ.

```json
{"type":"track","ts":1791877312.4,"camera_id":"camera_1","track_id":27,
 "first_ts":1791877300.0,"last_ts":1791877312.4,"duration":12.4,"frames":180,
 "items":{"backpack":120,"glasses":64},"alert":false,"first_side":"out","last_side":"in"}
```

| Trường | Ý nghĩa |
|---|---|
| `first_ts`, `last_ts`, `duration` | Lần đầu / cuối thấy, thời lượng (giây) |
| `frames` | Số khung hình đã thấy người này |
| `items` | `{nhãn: số khung thấy vật đó}`, chỉ vật thấy ≥ 3 khung |
| `alert` | Có lúc nào bị cảnh báo vũ khí |
| `first_side`, `last_side` | Phía lúc đầu / lúc cuối (`in`, `out` hoặc `null`) |

### 3.6 Trả lời lệnh của client

| `type` | Khi nào |
|---|---|
| `pong` | Trả lời `ping`: `{"type":"pong","ts":...}` |
| `subscribed` | Sau `subscribe` / `unsubscribe`: `{"type":"subscribed","topics":[...]}` |
| `cameras_set` | Sau `set_cameras`: `{"type":"cameras_set","cameras":[...] \| null}` |
| `status` | Trả lời `get_status` (cùng định dạng 3.2) |
| `error` | Lệnh sai: `{"type":"error","error":"unknown action: ..."}` |

## 4. Lệnh client → server (tuỳ chọn)

```json
{"action":"ping"}
{"action":"subscribe","topics":["people","tracks"]}
{"action":"unsubscribe","topics":["status"]}
{"action":"set_cameras","cameras":["camera_1"]}
{"action":"set_cameras","cameras":null}
{"action":"get_status"}
```

`set_cameras` với `null` hoặc `[]` = nhận mọi camera.

## 5. Nhóm đồ vật (`category`)

| `category` | Tên hiển thị | Nhãn (`label`) |
|---|---|---|
| `headwear` | Nón & mũ | hat, cap, beanie, bucket hat, sun hat, conical hat, helmet, hard hat, headscarf, headband |
| `face` | Kính & khẩu trang | glasses, sunglasses, goggles, face mask, face shield, balaclava |
| `bags` | Túi | backpack, handbag, shoulder bag, crossbody bag, waist bag, tote bag, shopping bag, plastic bag, briefcase, suitcase |
| `accessories` | Phụ kiện | watch, smartwatch, bracelet, necklace, earrings, tie, scarf, belt, gloves, lanyard, id badge, headphones |
| `devices` | Điện thoại | cell phone |
| `weapons` | Vũ khí – **`alert: true`** | knife, kitchen knife, pocket knife, machete, sword, axe, gun, handgun, rifle, shotgun, baseball bat, crowbar, baton, hammer, scissors, taser, slingshot |
| `custom` | Tự thêm | Từ do người vận hành thêm trên dashboard |

Bộ từ có thể thay đổi trên dashboard (bật/tắt từ, thêm từ). App nên dùng `vi` để hiển thị và `alert` để quyết định cảnh báo, không nên hard-code danh sách nhãn. Quần áo và tóc chỉ dùng nội bộ để lọc nhận nhầm, không bao giờ xuất hiện trong dữ liệu gửi đi.

## 6. REST API dùng kèm

Cùng host/cổng, trả JSON (không cần token).

| Đường dẫn | Dùng để |
|---|---|
| `GET /api/status` | Ảnh chụp trạng thái hiện tại (giống `status` nhưng chi tiết hơn) |
| `GET /api/cameras` | Danh sách camera (có cả URL nguồn, **chứa mật khẩu RTSP**) |
| `GET /api/cameras/{id}/stream.mjpg` | Video MJPEG đã vẽ khung người/đồ vật (dùng trực tiếp trong `<img src>`) |
| `GET /api/cameras/{id}/frame.jpg` | Ảnh JPEG mới nhất đã vẽ khung |
| `GET /api/cameras/{id}/snapshot.jpg` | Ảnh JPEG gốc mới nhất (không vẽ) |
| `GET /api/db/events?from=&to=&camera_id=&types=crossing,alert&limit=&offset=` | Sự kiện đã lưu (lấy bù khi mất kết nối). `from`/`to` là Unix giây |
| `GET /api/db/tracks?from=&to=&camera_id=&item=&alert_only=` | Lượt người đã lưu |
| `GET /api/db/hourly`, `GET /api/db/top_items` | Thống kê theo giờ, đồ vật phổ biến |

**Video cho app hiển thị:** muốn tự vẽ khung lên video, lấy video trực tiếp từ camera (RTSP) rồi vẽ `people[].box` / `objects[].box`. Dữ liệu trễ hơn hình khoảng 100–300 ms tuỳ máy. Muốn đơn giản thì nhúng `stream.mjpg` (đã vẽ sẵn).

## 7. Gợi ý dùng dữ liệu

| Cần hiển thị | Lấy từ |
|---|---|
| Đang thấy / trong vùng / ngoài vùng | `status.cameras[].persons / inside / outside` (hoặc `totals`) |
| Khung người, đồ vật mang theo | `people` |
| Danh sách đồ vật của một người | `people[].objects` (`vi` để hiển thị) |
| Cảnh báo vũ khí | Tức thời: `people[].alert`; thông báo/âm thanh: sự kiện `alert` |
| Bảng "vừa vào / vừa ra" | Sự kiện `crossing` |
| Thống kê sau khi người rời đi | Sự kiện `track` (topic `tracks`) |
| Camera mất tín hiệu | Sự kiện `camera`, hoặc `status.cameras[].status` |

## 8. Code mẫu

### JavaScript (trình duyệt hoặc Node 22+)

```js
const URL = "ws://192.168.1.50:8000/ws?topics=status,people,events";
let retry = 1000;

function connect() {
  const ws = new WebSocket(URL);
  ws.onopen = () => { retry = 1000; };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    switch (m.type) {
      case "status":
        for (const c of m.cameras) console.log(c.id, "thấy", c.persons, "trong", c.inside, "ngoài", c.outside);
        break;
      case "people":
        for (const cam of m.cameras)
          for (const p of cam.people)
            console.log(cam.id, `#${p.track_id}`, p.side, p.objects.map((o) => o.vi).join(", "));
        break;
      case "crossing":
        console.log(m.camera_id, `#${m.track_id}`, m.direction === "in" ? "VÀO" : "RA");
        break;
      case "alert":
        console.warn("CẢNH BÁO", m.camera_id, `#${m.track_id}`, m.items);
        break;
    }
  };
  ws.onclose = () => { setTimeout(connect, retry); retry = Math.min(retry * 2, 30000); };
}
connect();
```

### Python (`pip install websockets`)

```python
import asyncio, json, websockets

URL = "ws://192.168.1.50:8000/ws?topics=status,people,events"

async def main():
    retry = 1
    while True:
        try:
            async with websockets.connect(URL) as ws:
                retry = 1
                async for raw in ws:
                    m = json.loads(raw)
                    if m["type"] == "status":
                        t = m["totals"]
                        print("thấy", t["persons"], "trong", t["inside"], "ngoài", t["outside"])
                    elif m["type"] == "people":
                        for cam in m["cameras"]:
                            for p in cam["people"]:
                                print(cam["id"], p["track_id"], p["side"], [o["vi"] for o in p["objects"]])
                    elif m["type"] in ("crossing", "alert"):
                        print(m)
        except (OSError, websockets.ConnectionClosed):
            await asyncio.sleep(retry)
            retry = min(retry * 2, 30)

asyncio.run(main())
```

## 9. Kiểm tra nhanh

Trang `http://<IP>:8000/socket` của dashboard có khung **"Xem message trực tiếp"**: chọn topic, bấm **Kết nối** để xem đúng message app sẽ nhận, click một dòng để xem JSON đầy đủ. Trang này cũng liệt kê các client đang kết nối (app của bạn sẽ hiện ở đó).
