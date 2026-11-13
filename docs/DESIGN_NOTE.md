## Privacy versus availability (deliberate trade-off)

VANISH chooses privacy over guaranteed delivery.

- The relay delivers a message only to students connected at that moment.
  It stores no message text, keeps no history, and offers no way to fetch
  old messages.
- A student who is offline, or whose app was closed or killed, permanently
  misses messages sent in that time. Nothing is replayed on reconnect.
- We do not use push notifications, because that would require a third-party
  push service and a server-side copy of the message.
- Messages a student SENDS while offline are the exception, because they
  belong to the sender. They wait in the local SQLite outgoing queue with
  their original UUID for at most 60 seconds, then are sent exactly once
  or dropped.
- The 30-second lifetime starts when the relay accepts and forwards the
  message (expires_at = relay time + 30 s). Reading, receiving or
  backgrounding the app does not change it.

Delivery guarantee: duplicate-protected delivery with acknowledgment and retry.
It is NOT exactly-once. If the connection fails after the relay forwarded a
message but before the sender got the ack, the phone retries with the same
UUID. The relay recognises the ID, repeats its first ack and forwards nothing.
Receivers also ignore a repeated ID for 5 minutes. If the relay itself restarts
in between, it forgets the ID, and the receivers' duplicate check is then the
only protection.

The relay never retains message text. It forwards and forgets, keeping only
IDs and timestamps for duplicate detection and expiry announcements. On
phones, delivered messages are physically deleted from SQLite when expires_at
passes (checked every 500 ms, at startup and on resume). A message a student
sends while offline stays in that phone's local SQLite queue until it is
delivered or reaches the 60-second queue age. A dropped message's row stays up
to 5 seconds so the sender sees "Not delivered". Processed message IDs (no
text) are kept 5 minutes to block duplicates.

Cost: a user can miss messages. Benefit: no message content exists
anywhere after 30 seconds, on the relay or on any phone.