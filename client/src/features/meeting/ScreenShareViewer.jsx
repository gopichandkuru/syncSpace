import { useEffect, useRef } from 'react';

export default function ScreenShareViewer({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded shadow-lg text-sm font-medium animate-pulse">
        Viewing Screen Share
      </div>
    </div>
  );
}
