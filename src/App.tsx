import { v4 as uuidv4 } from "uuid";

import styles from "./App.module.scss";
import { useEffect, useRef, useState } from "react";

const generateUuid = () => {
  return uuidv4().replace(/-/g, "").slice(0, 8);
};

export const App = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [roomId] = useState(generateUuid);
  const [viewers, setViewers] = useState<any>([]);

  const startCapture = async () => {
    const newStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30 },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    setStream(newStream);
  };

  const stopCapture = () => {
    setStream(null);
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.container}>
      <div>ID комнаты: {roomId}</div>
      <div>
        <button>Присоединиться</button>{" "}
        <input placeholder="Введите ID комнаты"></input>
      </div>

      {!!stream ? (
        <button onClick={stopCapture}>Остановить демонстрацию экрана</button>
      ) : (
        <button onClick={startCapture}>Начать демонстрацию экрана</button>
      )}

      {!!stream && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />

          <div>Участники:</div>
          <div>
            {viewers.length > 0 ? (
              <ul>
                {viewers.map((viewer: any) => (
                  <li>{viewer.id}</li>
                ))}
              </ul>
            ) : (
              <div>Пока никто не присоединился...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
