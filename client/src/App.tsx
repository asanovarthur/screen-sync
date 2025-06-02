import { useEffect, useRef, useState } from "react";
import { generateUuid } from "./utils";
import { WebsocketServerMessageType } from "./enums";
import { STREAM_SETTINGS, STUN_SERVER_URL, WEBSOCKET_URL } from "./constants";
import styles from "./App.module.scss";

export const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [roomId] = useState(generateUuid);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [inputRoomId, setInputRoomId] = useState("");

  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  let iceCandidateQueue: any[] = [];
  let peerConnections: any = {};

  useEffect(() => {
    let socket = new WebSocket(WEBSOCKET_URL);

    setWebsocket(socket);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: WebsocketServerMessageType.register,
          sender: roomId,
        })
      );
    };

    const handleMessage = async (event: any) => {
      const viewerPeerConnection = viewerPeerConnectionRef.current;
      const stream = streamRef.current;

      const message = JSON.parse(event.data);

      switch (message.type) {
        case WebsocketServerMessageType.viewerRequest:
          const newPeerConnection = new RTCPeerConnection({
            iceServers: [{ urls: STUN_SERVER_URL }],
          });

          stream?.getTracks().forEach((track) => {
            newPeerConnection?.addTrack(track, stream);
          });

          const offer = await newPeerConnection?.createOffer();
          await newPeerConnection?.setLocalDescription(offer);

          socket?.send(
            JSON.stringify({
              type: WebsocketServerMessageType.offer,
              offer,
              target: message.sender,
              sender: roomId,
            })
          );

          peerConnections[message.sender] = newPeerConnection;

          newPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket?.send(
                JSON.stringify({
                  type: WebsocketServerMessageType.iceCandidate,
                  candidate: event.candidate,
                })
              );
            }
          };
          return;
        case WebsocketServerMessageType.offer:
          await viewerPeerConnection?.setRemoteDescription(message.offer);
          const answer = await viewerPeerConnection?.createAnswer();
          await viewerPeerConnection?.setLocalDescription(answer);
          socket?.send(
            JSON.stringify({
              type: WebsocketServerMessageType.answer,
              answer,
              target: message.sender,
              sender: roomId,
            })
          );
          return;
        case WebsocketServerMessageType.iceCandidate:
          if (viewerPeerConnection) {
            viewerPeerConnection
              .addIceCandidate(message.candidate)
              .catch((e: any) => console.error(e));
          } else {
            iceCandidateQueue.push(message.candidate);
          }
          return;
        case WebsocketServerMessageType.answer:
          const peerConnection = peerConnections[message.sender];

          if (peerConnection?.signalingState === "have-local-offer") {
            const answer = new RTCSessionDescription(message.answer);
            await peerConnection?.setRemoteDescription(answer);

            iceCandidateQueue.forEach((candidate) => {
              peerConnection
                .addIceCandidate(candidate)
                .catch((e: any) => console.error(e));
            });
            iceCandidateQueue = [];
          }
          return;
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, []);

  const startCapture = async () => {
    const newStream = await navigator.mediaDevices.getDisplayMedia(
      STREAM_SETTINGS
    );

    setStream(newStream);
    streamRef.current = newStream;
  };

  const stopCapture = () => {
    setStream(null);
    streamRef.current = null;
  };

  const handleConnectClick = () => {
    const newPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: STUN_SERVER_URL }],
    });

    viewerPeerConnectionRef.current = newPeerConnection;

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        websocket?.send(
          JSON.stringify({
            type: WebsocketServerMessageType.iceCandidate,
            candidate: event.candidate,
            target: inputRoomId,
          })
        );
      }
    };

    newPeerConnection.ontrack = (event) => {
      if (event.track.kind === "video") {
        const remoteStream = event.streams[0];
        setRemoteStream(remoteStream);
      }
    };

    // TODO: добавить обработку некорректного roomId
    websocket?.send(
      JSON.stringify({
        type: WebsocketServerMessageType.viewerRequest,
        target: inputRoomId,
        sender: roomId,
      })
    );
  };

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.container}>
      <div>ID комнаты: {roomId}</div>
      <div>
        <button onClick={handleConnectClick}>Присоединиться</button>{" "}
        <input
          placeholder="Введите ID комнаты"
          onChange={(e) => {
            setInputRoomId(e.target.value);
          }}
        ></input>
      </div>

      {!!streamRef.current ? (
        <button onClick={stopCapture}>Остановить демонстрацию экрана</button>
      ) : (
        <button onClick={startCapture}>Начать демонстрацию экрана</button>
      )}

      {/* TODO: Сделать так, чтобы стрим не показывался, когда пользователь нажимает "Закрыть доступ" в браузере */}
      {!!stream && (
        <>
          <div>Вы показываете:</div>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />
        </>
      )}

      {!!remoteStream && (
        <>
          <div>Полученное видео:</div>
          <video
            ref={remoteVideoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />
        </>
      )}
    </div>
  );
};
