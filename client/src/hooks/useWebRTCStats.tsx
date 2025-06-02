import { useEffect, useState } from "react";

interface UseWebRTCStatsType {
  (peerConnection: RTCPeerConnection | null): {
    fps?: number;
    ping?: number;
  };
}

export const useWebRTCStats: UseWebRTCStatsType = (peerConnection) => {
  const [stats, setStats] = useState({});

  useEffect(() => {
    const getStats = async () => {
      if (peerConnection) {
        const stats = await peerConnection.getStats();
        let fps;
        let roundTripTime;

        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            fps = report.framesPerSecond;
          }

          if (report.type === "candidate-pair" && report.nominated) {
            roundTripTime = report.currentRoundTripTime * 1000; // из секунд в мс
          }
        });

        setStats({ fps, ping: roundTripTime });
      }
    };

    const getStatsInterval = setInterval(getStats, 1000);

    return () => {
      clearInterval(getStatsInterval);
    };
  }, [peerConnection]);

  return stats;
};
