## Websocket
- Là công nghệ cho phép giao tiếp 2 chiều giữa client và server bằng cách sử dụng TCP socket => hiệu quả, ít tốn kém
- Giao thức chuẩn thông thường của WebSocket là `ws://`, giao thức secure mã hóa là `wss://`
- Máy chủ WebSocket có thể được viết bằng bất kỳ ngôn ngữ lập trình phía máy chủ nào có khả năng với [ổ cắm Berkeley](https://en.wikipedia.org/wiki/Berkeley_sockets) , chẳng hạn như C(++), Python, php, nodejs,.....
- Dữ liệu truyền tải thông qua giao thức HTTP (thường dùng với kĩ thuật Ajax) chứa nhiều dữ liệu không cần thiết trong phần header. Một header request/response của HTTP có kích thước khoảng 871 byte. Trong khi đó, socket sau khi đã kết nối thì kích thước header khoảng 2 byte. 
	- Ví dụ với 10k lượt request:
		-  HTTP: 871 x 10,000 = 8,710,000 bytes = 69,680,000 bits per second (66 Mbps)
		-  WebSocket: 2 x 10,000 = 20,000 bytes = 160,000 bits per second (0.153 Kbps)


=> nhìn thôi đã thấy ngon rồi

**Ưu điểm**

-   WebSockets cung cấp khả năng giao tiếp hai chiều mạnh mẽ, có độ trễ thấp và dễ xử lý lỗi. 
-   API cũng rất dễ sử dụng trực tiếp mà không cần bất kỳ các tầng bổ sung nào.

**Nhược điểm**
-   Nó là một đặc tả mới của HTML5, nên nó vẫn chưa được tất cả các trình duyệt hỗ trợ.


## Quá trình `connect`:
- client phải gửi một WebSocket handshake request đến server.
	```
	GET /mychat HTTP/1.1
	Host: server.example.com 
	Upgrade: websocket 
	Connection: Upgrade 
	Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw== 
	Sec-WebSocket-Protocol: chat 
	Sec-WebSocket-Version: 13 
	Origin: http://example.com
	```
- Server sẽ gửi trả lại WebSocket handshake response.
	```
	HTTP/1.1 101 Switching 
	Protocols Upgrade: websocket 
	Connection: Upgrade 
	Sec-WebSocket-Accept: HSmrc0sMlYUkAGmm5OPpG2HaGWk=
	```

- Để xác nhận việc kết nối:
	- client sẽ gửi một giá trị Sec-WebSocket-Key được mã hóa bằng Based64 đến server. 
	- Sau đó bên server sẽ thực hiện: 
		- Nối thêm chuỗi cố định là `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` vào Sec-WebSocket-Key để được chuỗi mới là `x3JJHMbDL1EzLkh9GBhXDw==258EAFA5-E914-47DA-95CA-C5AB0DC85B11`.
		- Thực hiện mã hóa SHA-1 chuỗi trên để được `1d29ab734b0c9585240069a6e4e3e91b61da1969`.
		-  Mã hóa kết quả vừa nhận được bằng Base64 để được `HSmrc0sMlYUkAGmm5OPpG2HaGWk=`. 
		- Gửi response lại client kèm với giá trị Sec-WebSocket-Accept chính là chuỗi kết quả vừa tạo ra.
	- Client sẽ kiểm tra status code (phải bằng 101) và Sec-WebSocket-Accept xem có đúng với kết quả mong đợi không và thực hiện kết nối.
