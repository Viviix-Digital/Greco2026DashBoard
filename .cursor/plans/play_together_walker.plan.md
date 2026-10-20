---
name: Play Together Walker
overview: Rebuild the room’s toy-diorama shading and replace the static limb piles with one code-built chibi body. The player is the detailed version and walks the floor with a locked-foot gait. Furniture layout, camera, and chrome stay.
todos:
  - id: grade
    content: Add a shared soft wrap material and retune window light, fill, and contact shadows so skin and walls read as matte clay
    status: pending
  - id: rig
    content: Build a parented chibi joint tree with overlapping plush volumes, face, hair, cuffs, and shoes, all in code
    status: pending
  - id: gait
    content: Drive a two-step walk with foot lock, two-bone leg IK, opposite arm swing, and a short idle blend
    status: pending
  - id: steer
    content: Click empty floor to walk, slide around furniture footprints, and keep the frozen room shadow map still
    status: pending
  - id: residents
    content: Rebuild the four reference people on the same body, lock their activity poses, and add a small breath
    status: pending
  - id: verify
    content: Compare Default and Close against Ref.png, then walk a loop around the rug in day and night
    status: pending
isProject: false
---

# Phối cảnh Play Together và người chơi đi lại

Sân khấu giữ nguyên bố cục trong [Ref.png](.cursor/plans/Ref.png) và [src/scene/defaultScene.ts](src/scene/defaultScene.ts): hai tường, sàn kem, thảm xanh, bốn người đang làm việc, mèo, camera iso cố định, chrome DOM. Phần dựng lại là chất liệu, ánh sáng, và toàn bộ cơ thể người. Người chơi là bản chi tiết nhất và là người duy nhất đi trong phòng.

Mọi mesh, vật liệu, và chuyển động viết trong TypeScript. Không glTF, không texture, không clip ngoài, không HDRI.

## Vì sao bản hiện tại chưa ra vibe

[src/scene/characters.ts](src/scene/characters.ts) đặt từng tay và chân bằng `aim()`: mỗi đoạn là một capsule đứng riêng, không có khớp cha-con. Tư thế là một bức ảnh. [src/main.ts](src/main.ts) chỉ chạy tween giao diện.

Tỷ lệ đã thấp, nhưng chi mỏng (tay bán kính 0.045) nên đọc như người que, không như đồ chơi nhồi. `MeshLambertMaterial` cho nửa tối gần như một màu, trong khi Play Together là đất sét mềm: sáng tròn phía trên, tối vẫn còn màu.

`renderer.shadowMap.autoUpdate = false` trong [src/scene/createScene.ts](src/scene/createScene.ts) là đúng cho phòng đứng yên. Người đi không được đúc bóng vào map đó, nếu không cả căn phòng sẽ rung mỗi frame.

## Lớp không khí của cả căn phòng

Một vật liệu bọc dùng chung, thay cho lambert trần trên da, vải, tường, gỗ, và lá:

- Half-lambert: `diffuse * (dot(n, l) * 0.5 + 0.5)`, rồi một gradient hai dừng rất mềm. Không viền mực, không specular.
- Màu vẫn lấy từ `PAL` trong [src/theme.ts](src/theme.ts). Shader chỉ đổi cách sáng tối.
- Sàn, vảy cá, vân gỗ giữ công thức hiện tại trong [src/materials.ts](src/materials.ts), nhân thêm cùng kiểu wrap để cả phòng một chất.

Đèn trong [src/scene/lights.ts](src/scene/lights.ts):

- Key cửa sổ vẫn từ bên trái, cường độ giảm nhẹ, bán kính penumbra giữ mềm.
- Fill và hemisphere tăng để má và áo không bị nửa mặt đen. Play Together gần như không có vùng tối đặc.
- Đèn bàn vẫn là practical ấm, blob cộng trên tường.
- Map bóng phòng render một lần rồi đóng băng, kể cả khi người đang đi và khi zoom.

Sau khi người mới đứng vào, chỉ sửa đồ nào còn cạnh hộp sắc hoặc cao hơn vai người chơi. Không dựng lại catalog và thanh công cụ.

Tỷ lệ mục tiêu khi người đứng trên sàn: cao khoảng 1.12, tường 3.08. Đầu chiếm gần một phần ba chiều cao. Người đọc là món đồ trong nhà búp bê.

## Cơ thể người chơi

Một factory `buildAvatar(recipe)` trong `src/scene/characters/`. Khớp là `Object3D` lồng nhau. Mesh cứng parent vào khớp, chồng lên nhau ở khuỷu và gối. Cách này ra silhouette đồ chơi và tránh skin weight viết tay.

```text
root          vị trí sàn, yaw
  pelvis      bob, lắc, xoay
    spine
      chest
        neck
          head
        shoulder.L / shoulder.R
          upperArm
            forearm
              hand
    hip.L / hip.R
      thigh
        shin
          foot
```

Khối, tất cả là primitive bo tròn:

- Đầu cầu hơi dẹt, đường kính khoảng 0.34. Cổ rất ngắn.
- Mắt oval, lòng trắng, con ngươi, một chấm sáng, má, miệng cong nhỏ. Cùng ngôn ngữ minh họa hiện tại, to và sạch hơn.
- Tóc: mũ, mái, hai lọn, parent vào đầu. Người chơi có thêm một lớp mái và lọn sau.
- Thân: khối ngực và hông tròn, gấu áo, cổ áo.
- Tay áo và ống quần là mesh của chính xương đó, nên gập khuỷu thì vải đi theo. Một vòng nhỏ ở khuỷu và gối che khe hở.
- Bàn tay là mitt cộng ngón cái. Ở iso, năm ngón riêng làm rối silhouette.
- Giày đế dày, mũi cầu, parent vào bàn chân.
- Bán kính chi dày hơn bản hiện tại: đùi khoảng 0.07, cánh tay khoảng 0.055, để đọc là nhồi bông.

Recipe người chơi: tóc ngắn nâu, áo kem, quần xanh, giày nâu. Đủ gần cậu bé đọc sách để cùng một gia đình màu, và đủ khác để không trùng người đang ngồi.

Bốn người trong ảnh dùng cùng factory, ít khối phụ hơn: không lớp mái riêng, không đế giày tách, không nếp khuỷu. Màu và kiểu tóc giữ `sweaterCream`, `yellow`, `dress`, `greenSweater`.

## Dáng đi

Một pha `phase` trong `[0, 1)`. Một vòng là hai bước, dài khoảng 0.62 giây ở tốc độ 0.85 đơn vị mỗi giây. Bước dài khoảng 0.32. Biên độ cố ý hơi rõ vì camera cao 30 độ, ortho, bước thật sẽ biến mất.

Chân không trượt:

- Hai chân lệch pha 0.5.
- Lúc chống, bàn chân giữ nguyên điểm XZ đã đặt. Hông đi qua điểm đó.
- Lúc nhấc, bàn chân đi từ điểm đặt cũ tới điểm đặt mới. Cao độ là `sin(t * π) * 0.07`.
- Điểm đặt chỉ chốt ở frame rời đất, không tính lại mỗi frame.
- Gối giải bằng IK hai xương trong mặt phẳng chân. Vector gối hướng ra ngoài và hơi ra trước, để gối không bật ngược.
- Cao độ bàn chân lúc chống bằng mặt sàn cộng độ dày đế. Thảm và gạch cùng một mặt đi.

Thân và tay, cùng một pha:

- Hông nảy hai lần mỗi vòng, biên độ khoảng 0.025, thấp nhất lúc chân chạm đất.
- Hông lệch ngang khoảng 0.012 về phía chân đang chống, xoay yaw khoảng 4 độ.
- Ngực xoay ngược lại khoảng 40 phần trăm biên độ hông.
- Vai đối chân, khoảng ±22 độ. Khuỷu giữ gập khoảng 25 độ và khép thêm một chút khi tay về sau.
- Đầu bù khoảng 70 phần trăm độ nảy của hông, nên mặt gần như nằm yên. Nghiêng rất nhẹ theo hướng đi.

Vào và ra:

- Idle: ngực thở `scale.y` trong khoảng 1 ± 0.012, chu kỳ 2.4 giây. Trọng tâm đổi chân mỗi khoảng 3.5 giây.
- Blend idle sang walk theo tốc độ, trong khoảng 0.18 giây.
- Yaw của root slerp theo hướng vận tốc. Chân vẫn IK trong lúc quay.

Bóng người chơi là đĩa tiếp xúc sẵn có trong [src/scene/contactShadow.ts](src/scene/contactShadow.ts), parent dưới chân đang chống. Chân nhấc thì đĩa của chân đó co và nhạt. `castShadow` của avatar tắt. Map bóng phòng không cập nhật.

## Đi trong phòng

Sinh ở sàn trống phía trước thảm, tránh cậu bé nằm và con mèo.

Click một điểm sàn trống thì người đi tới đó. Click khi đang đặt hoặc kéo đồ vẫn thuộc editor. Phím mũi tên vẫn đẩy prop đang chọn.

Va chạm là hình tròn bán kính khoảng 0.22, trừ footprint đồ trong `userData.foot` và hai tường. Vướng thì trượt dọc mép hình chữ nhật đó. Phòng một tầng, ít vật, chưa cần navmesh. Người không đẩy ghế và không leo bệ cửa sổ.

Đích còn 0.08 thì dừng và về idle. Đang đi, mặt quay theo vận tốc.

Bốn người và mèo ở đúng tọa độ `defaultScene`. Họ thở nhẹ, không rời chỗ. Tư thế đọc, vẽ, nằm, ngồi uống là các góc khớp khóa sẵn trên cùng bộ xương.

## Việc gọi mỗi frame

`editor.update()` đã chạy trong vòng `requestAnimationFrame`. Gait và steering tick ở đó bằng `dt` sẵn có. Không thêm vòng lặp thứ hai.

## Thứ tự làm và cách đối chiếu

1. Wrap material và đèn. Chụp phòng trống người, so tường, sàn, thảm với ảnh.
2. Avatar đứng idle trong phòng. So đầu, vai, tay, giày ở zoom Default và Close.
3. Đi thẳng trên sàn: chân khóa, gối ra ngoài, tay đối chân, đầu ổn.
4. Click để đi vòng quanh thảm, né bàn, ghế, cậu bé, mèo. Đổi ngày đêm và zoom trong lúc đang đi. Bóng tường và chân bàn đứng yên.
5. Dựng bốn người bằng factory, khóa pose, bật thở. So lại từng người với ảnh.

Xong khi một vòng đi quanh thảm đọc rõ ở zoom Default, chân không trượt, dừng và rẽ không giật, và căn phòng vẫn là căn trong ảnh tham chiếu.
