import sherpa_onnx, soundfile as sf, numpy as np, json, sys
audio, sr = sf.read('voz16k.wav', dtype='float32')
cfg = sherpa_onnx.VadModelConfig()
cfg.silero_vad.model = 'silero_vad.onnx'
cfg.silero_vad.min_silence_duration = 0.18
cfg.silero_vad.min_speech_duration = 0.15
cfg.silero_vad.threshold = 0.5
cfg.silero_vad.max_speech_duration = 12
cfg.sample_rate = sr
vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=400)
ws = cfg.silero_vad.window_size
segs = []
for i in range(0, len(audio), ws):
    vad.accept_waveform(audio[i:i+ws])
    while not vad.empty():
        s = vad.front; segs.append((s.start / sr, np.array(s.samples))); vad.pop()
vad.flush()
while not vad.empty():
    s = vad.front; segs.append((s.start / sr, np.array(s.samples))); vad.pop()
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder='sherpa-onnx-whisper-small/small-encoder.int8.onnx',
    decoder='sherpa-onnx-whisper-small/small-decoder.int8.onnx', tokens='sherpa-onnx-whisper-small/small-tokens.txt',
    language='es', task='transcribe', num_threads=4)
out = []
for st, smp in segs:
    s = rec.create_stream(); s.accept_waveform(sr, smp); rec.decode_stream(s)
    r = s.result
    out.append({'start': round(st, 3), 'end': round(st + len(smp) / sr, 3), 'text': r.text.strip(),
                'tokens': list(r.tokens), 'ts': [round(x, 3) for x in (r.timestamps or [])]})
    print(f"{st:7.2f} {st+len(smp)/sr:7.2f} {r.text.strip()}", flush=True)
json.dump(out, open('segments.json', 'w'), ensure_ascii=False, indent=1)
