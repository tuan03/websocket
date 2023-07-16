## Server Websocket (handshake)
**Quá trình `Connect`:**
- Client gửi yêu cầu đến server với header dạng: 
	```
	GET /chat HTTP/1.1
	Host: example.com:8000
	Upgrade: websocket
	Connection: Upgrade
	Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
	Sec-WebSocket-Version: 13
	```
	*(ta có thể tùy chỉnh mà thêm các header khác như `User-Agent`, `Referer`,`Cookie`,... vì nó không liên quan gì đến phần của `websocket`)
- Sau đó máy chủ sẽ trả về header dạng:
	```
	HTTP/1.1 101 Switching Protocols
	Upgrade: websocket
	Connection: Upgrade
	Sec-WebSocket-Accept: ${hash}
	```
- Để có được `${hash}`, ta lấy chuỗi (const) `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` nối vào sau của chuỗi tại `sec-websocket-key`. rồi dùng thuật toán băm `SHA-1` để băm chuỗi sau khi đã nối, sau đó trả về kết quả dưới dạng `base64`. Như code sau:
	```
	let hash = crypto.createHash('sha1')
	.update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
	.digest('base64');
	```
==>> Quy trình trên để xác định máy chủ có hỗ trợ WebSockets hay không. Điều này rất quan trọng vì các vấn đề bảo mật có thể phát sinh nếu máy chủ chấp nhận kết nối WebSockets nhưng diễn giải dữ liệu dưới dạng yêu cầu HTTP.
Sau quá trình trên, quá trình bắt tay đã hoàn tất và ta có thể bắt đầu trao đổi dữ liệu!

## Lưu ý:

> Thực tế, [phần 5.1 của thông số kỹ thuật](https://datatracker.ietf.org/doc/html/rfc6455#section-5.1) nói rằng máy chủ của bạn phải ngắt kết nối với máy khách nếu máy khách đó gửi tin nhắn không được che.

- Nghĩa là, truyền tải dữ liễu qua lại giữa client và server thông qua ws:// thì phải được mã hóa.
- Server và Client `send` cho nhau dữ liệu là `buffer` đã `encoded` (bước encode này là mình phải tự làm nếu công nghệ không giúp ta), server và client sau khi nhận buffer đó và phải `decode` để được dữ liệu cuối cùng.
	- **Một lưu ý đặc biệt**, Khi ta dùng `WebSocket()` ở client để kết nối với server `ws` thì nó đã được tích hợp sẵn tự encode khi send data lên server và tự decode khi nhận data từ server giúp ta (quá là tiện, nếu không thì phải làm chay :v).
	- Bên cạnh đó khi tạo server ws thì có nhiều module, frameword,lib,... gì gì đó nó giúp ta encode khi gửi đi và decode khi nhận data. Cái này sẽ tùy theo cái các bạn sử dụng, mình sẽ để code tạo server ws bằng http, phải làm chay mọi thứ :((( 
- Có 4 sự kiện chính ở client khi dùng `WebSocket` : 
	```
	ws.onopen //on khi connect thành công
	ws.onmessage //on khi nhận data từ server
	ws.onclose // on khi đóng kết nối
	ws.onerror //on khi có lỗi
	```
- Còn ở server thì tùy theo cái ta dùng làm nên server sẽ có những tên event khác nhau, nhưng chung quy cũng là 4 event : "Kết nối", "nhận data", "đóng kết nối", "Có lỗi".

## Cách decode :
Như đã nói ở trên, ta nhận data từ client sẽ Buffer encoded, tùy gói ta dùng mà nó decode giúp ta, ta làm chay thì phải tự lực mà decode :v 
*(Từ server về client thì có `WebSocket()` nó decode sẵn rồi)*

```
		
								(bit)
      0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
     +-+-+-+-+-------+-+-------------+-------------------------------+
     |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
     |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
     |N|V|V|V|       |S|             |   (if payload len==126/127)   |
     | |1|2|3|       |K|             |                               |
     +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
     |     Extended payload length continued, if payload len == 127  |
     + - - - - - - - - - - - - - - - +-------------------------------+
     |                               |Masking-key, if MASK set to 1  |
     +-------------------------------+-------------------------------+
     | Masking-key (continued)       |          Payload Data         |
     +-------------------------------- - - - - - - - - - - - - - - - +
     :                     Payload Data continued ...                :
     + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
     |                     Payload Data continued ...                |
     +---------------------------------------------------------------+
```

- Bit MASK cho biết tin nhắn có được mã hóa hay không. Tin nhắn từ client phải được ẩn, vì vậy máy chủ của bạn phải mong đợi giá trị này là 1.
- Trường opcode xác định cách diễn giải dữ liệu tải trọng: `0x0`để tiếp tục, `0x1`cho văn bản (luôn được mã hóa bằng UTF-8), `0x2`cho nhị phân và cái gọi là "mã kiểm soát" khác sẽ được thảo luận sau. Trong phiên bản WebSockets này, `0x3`to `0x7`và `0xB`to `0xF`không có ý nghĩa gì.
- Bit FIN cho biết đây có phải là tin nhắn cuối cùng trong một chuỗi hay không. Nếu là 0, thì máy chủ sẽ tiếp tục lắng nghe thêm các phần của thông báo; mặt khác, máy chủ sẽ xem xét thông báo được gửi. Thêm về điều này sau.

Cách giải mã
- Nếu bit MASK đã được đặt (và nó phải như vậy đối với các thông báo từ máy khách đến máy chủ), hãy đọc 4 octet tiếp theo (32 bit); đây là chìa khóa mặt nạ. Khi chiều dài tải trọng và khóa mặt nạ được giải mã, bạn có thể đọc số byte đó từ ổ cắm. Hãy gọi data `ENCODED`và key `MASK`. Để nhận `DECODED`, hãy lặp qua các octet (byte hay còn gọi là ký tự cho dữ liệu văn bản) của `ENCODED`và XOR octet với (i modulo 4)octet thứ của `MASK`. Trong mã giả (có thể là JavaScript hợp lệ):
```
const MASK = [1, 2, 3, 4]; // 4-byte mask
const ENCODED = [105, 103, 111, 104, 110]; // encoded string "hello"

// Create the byte Array of decoded payload
const DECODED = Uint8Array.from(ENCODED, (elt, i) => elt ^ MASK[i % 4]); // Perform an XOR on the mask
```
Cách phân mảng dữ liệu: 
- Các trường FIN và opcode hoạt động cùng nhau để gửi một thông báo được chia thành các khung riêng biệt. Điều này được gọi là phân mảnh tin nhắn. Phân mảnh chỉ khả dụng trên các opcode `0x0`thành `0x2`.
- Nhớ lại rằng opcode cho biết khung có nghĩa là gì. Nếu là `0x1`, tải trọng là văn bản. Nếu là `0x2`, tải trọng là dữ liệu nhị phân. Tuy nhiên, nếu đó là `0x0,`khung là khung tiếp nối; điều này có nghĩa là máy chủ sẽ nối tải trọng của khung với khung cuối cùng mà nó nhận được từ máy khách đó. Đây là một bản phác thảo sơ bộ, trong đó máy chủ phản ứng với máy khách gửi tin nhắn văn bản. Tin nhắn đầu tiên được gửi trong một khung duy nhất, trong khi tin nhắn thứ hai được gửi qua ba khung. Chi tiết FIN và opcode chỉ được hiển thị cho máy khách:
	```
	Client: FIN=1, opcode=0x1, msg="hello"
	Server: (process complete message immediately) Hi.
	Client: FIN=0, opcode=0x1, msg="and a"
	Server: (listening, new message containing text started)
	Client: FIN=0, opcode=0x0, msg="happy new"
	Server: (listening, payload concatenated to previous message)
	Client: FIN=1, opcode=0x0, msg="year!"
	Server: (process complete message) Happy new year to you too!
	```
Lưu ý rằng khung đầu tiên chứa toàn bộ thông báo (có `FIN=1`và `opcode!=0x0`), vì vậy máy chủ có thể xử lý hoặc phản hồi khi thấy phù hợp. Khung thứ hai được gửi bởi máy khách có tải trọng văn bản ( `opcode=0x1`), nhưng toàn bộ tin nhắn vẫn chưa đến ( `FIN=0`). Tất cả các phần còn lại của tin nhắn đó được gửi với các khung tiếp theo ( `opcode=0x0`) và khung cuối cùng của tin nhắn được đánh dấu bằng `FIN=1`.



## Ví dụ:

Bạn có 1 buffer encoded: <81 81 6C 93 C7 E4 0D> (hex)
chuyển sang nhị phân thì sẽ thành :
10000001 10000001 1101100 10010011 11000111 11100100 1101 
Và theo bảng ở trên ta có:
(1 FIN) - (000) (0001 - UTF8)  (1 MARK ENCODE) (0000001 dữ liệu 1byte (1 từ)) **1101100 10010011 11000111 11100100** (1101 từ của ta)
Phần in đậm là 4 byte mark để giải mã xor
Từ đây dùng xor theo như ở trên kia : 1101 ^ 1101100 = 97(dec - chữ cái a)
