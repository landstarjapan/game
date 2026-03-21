import { useState, useRef } from "react";

// Approach 3: Generate WAV as Blob URL (more compatible than data URI)
function createBeepBlob(freq = 440, dur = 0.3, vol = 0.5) {
  const sr = 22050;
  const n = (sr * dur) | 0;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  // RIFF header
  [0x52494646].forEach((x,i) => v.setUint32(0, x, false)); // "RIFF"
  v.setUint32(4, 36 + n * 2, true);
  [0x57415645].forEach((x,i) => v.setUint32(8, x, false)); // "WAVE"
  [0x666D7420].forEach((x,i) => v.setUint32(12, x, false)); // "fmt "
  v.setUint32(16, 16, true); // chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sr, true); // sample rate
  v.setUint32(28, sr * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  [0x64617461].forEach((x,i) => v.setUint32(36, x, false)); // "data"
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.max(0, 1 - t / dur) * vol;
    const sample = Math.sin(2 * Math.PI * freq * t) * env;
    v.setInt16(44 + i * 2, (sample * 32767) | 0, true);
  }
  const blob = new Blob([buf], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export default function Test() {
  const [log, setLog] = useState([]);
  const blobUrl = useRef(null);

  const addLog = (msg) => setLog(p => [...p.slice(-5), msg]);

  // Method A: Web Audio API (we know this fails in iframe)
  const testWebAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      o.frequency.value = 440;
      o.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.3);
      addLog("A: WebAudio state=" + ctx.state);
    } catch(e) {
      addLog("A: エラー " + e.message);
    }
  };

  // Method B: new Audio() with Blob URL
  const testBlobAudio = () => {
    try {
      if (!blobUrl.current) blobUrl.current = createBeepBlob(440, 0.3, 0.5);
      const a = new Audio(blobUrl.current);
      a.play().then(() => addLog("B: Blob再生OK！")).catch(e => addLog("B: " + e.message));
    } catch(e) {
      addLog("B: エラー " + e.message);
    }
  };

  // Method C: DOM audio element
  const audioElRef = useRef(null);
  const testDomAudio = () => {
    try {
      if (!audioElRef.current) {
        if (!blobUrl.current) blobUrl.current = createBeepBlob(880, 0.3, 0.5);
        const a = document.createElement("audio");
        a.src = blobUrl.current;
        a.preload = "auto";
        document.body.appendChild(a);
        audioElRef.current = a;
      }
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().then(() => addLog("C: DOM再生OK！")).catch(e => addLog("C: " + e.message));
    } catch(e) {
      addLog("C: エラー " + e.message);
    }
  };

  const s = { fontSize: 22, padding: "18px 36px", borderRadius: 14, border: "none", color: "#fff", margin: 4, width: "90%", maxWidth: 300 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 8, background: "#222", color: "#fff", fontFamily: "sans-serif", padding: 20 }}>
      <p style={{ fontSize: 13, color: "#888" }}>3つの方法でテスト</p>
      
      <button onClick={testWebAudio} style={{ ...s, background: "#E53935" }}>
        A: WebAudio API
      </button>
      <button onClick={testBlobAudio} style={{ ...s, background: "#FF8F00" }}>
        B: new Audio(Blob)
      </button>
      <button onClick={testDomAudio} style={{ ...s, background: "#4CAF50" }}>
        C: DOM audio要素
      </button>
      
      <div style={{ fontSize: 13, color: "#ccc", marginTop: 10, width: "90%", maxWidth: 300 }}>
        {log.map((l, i) => <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #333" }}>{l}</div>)}
      </div>
    </div>
  );
}
