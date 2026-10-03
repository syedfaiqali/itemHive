import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { CameraOff, RefreshCw } from 'lucide-react';
import { describeCameraError, detectFaces, loadFaceApi, type DetectedFace } from '../../lib/faceRecognition';

export type FaceCameraTone = 'neutral' | 'success' | 'warning' | 'error';

interface FaceCameraProps {
    /** Called after every detection pass with the faces in view, largest first. */
    onDetect?: (faces: DetectedFace[], video: HTMLVideoElement) => void;
    /** Keeps the camera running but skips detection, e.g. while a result is on screen. */
    paused?: boolean;
    intervalMs?: number;
    tone?: FaceCameraTone;
    overlay?: React.ReactNode;
}

type Phase = 'loading' | 'ready' | 'error';

const FaceCamera: React.FC<FaceCameraProps> = ({ onDetect, paused = false, intervalMs = 450, tone = 'neutral', overlay }) => {
    const theme = useTheme();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const onDetectRef = React.useRef(onDetect);
    const pausedRef = React.useRef(paused);
    const [phase, setPhase] = React.useState<Phase>('loading');
    const [loadingText, setLoadingText] = React.useState('Starting camera...');
    const [error, setError] = React.useState('');
    const [aspectRatio, setAspectRatio] = React.useState(4 / 3);
    const [attempt, setAttempt] = React.useState(0);

    React.useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);
    React.useEffect(() => {
        pausedRef.current = paused;
        if (paused) {
            const canvas = canvasRef.current;
            canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [paused]);

    React.useEffect(() => {
        let cancelled = false;
        let stream: MediaStream | null = null;

        const start = async () => {
            setPhase('loading');
            setError('');
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia unavailable');
                setLoadingText('Starting camera...');
                const modelsReady = loadFaceApi();
                // Awaited below; this only stops a camera failure from also reporting an unhandled rejection.
                modelsReady.catch(() => undefined);
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                });
                // Cleanup may have run while permission was pending; release the camera it could not see.
                if (cancelled) {
                    mediaStream.getTracks().forEach((track) => track.stop());
                    return;
                }
                stream = mediaStream;

                const video = videoRef.current!;
                video.srcObject = stream;
                await video.play();
                if (video.videoWidth && video.videoHeight) setAspectRatio(video.videoWidth / video.videoHeight);

                setLoadingText('Loading face recognition...');
                await modelsReady;
                if (!cancelled) setPhase('ready');
            } catch (startError: unknown) {
                if (cancelled) return;
                const isCameraError = startError instanceof DOMException || (startError as Error)?.message === 'getUserMedia unavailable';
                setError(isCameraError
                    ? describeCameraError(startError)
                    : 'Face recognition could not be loaded. Check the internet connection and try again.');
                setPhase('error');
            }
        };

        start();
        return () => {
            cancelled = true;
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [attempt]);

    React.useEffect(() => {
        if (phase !== 'ready') return;
        let cancelled = false;
        let timer: number | undefined;

        const draw = (faces: DetectedFace[], video: HTMLVideoElement) => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext('2d');
            if (!canvas || !context) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.clearRect(0, 0, canvas.width, canvas.height);
            faces.forEach((face, index) => {
                context.lineWidth = Math.max(3, canvas.width / 160);
                context.strokeStyle = index === 0 && face.isCloseEnough ? theme.palette.success.main : theme.palette.warning.main;
                context.strokeRect(face.box.x, face.box.y, face.box.width, face.box.height);
            });
        };

        const tick = async () => {
            const video = videoRef.current;
            if (!pausedRef.current && video && video.readyState >= 2) {
                try {
                    const faces = await detectFaces(video);
                    if (cancelled) return;
                    if (!pausedRef.current) {
                        draw(faces, video);
                        onDetectRef.current?.(faces, video);
                    }
                } catch {
                    // A dropped frame is harmless; the next tick tries again.
                }
            }
            if (!cancelled) timer = window.setTimeout(tick, intervalMs);
        };

        tick();
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [phase, intervalMs, theme]);

    const borderColor = {
        neutral: theme.palette.divider,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
    }[tone];

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: String(aspectRatio),
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#111',
                border: '4px solid',
                borderColor,
                transition: 'border-color 0.2s',
            }}
        >
            {/* Mirrored like a selfie camera; the canvas is mirrored the same way so boxes line up. */}
            <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill', transform: 'scaleX(-1)' }}
            />
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }}
            />

            {phase === 'loading' && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, color: '#fff', bgcolor: 'rgba(0,0,0,0.55)' }}>
                    <CircularProgress color="inherit" size={36} />
                    <Typography fontWeight={700}>{loadingText}</Typography>
                </Box>
            )}

            {phase === 'error' && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center', color: '#fff', bgcolor: 'rgba(0,0,0,0.75)' }}>
                    <CameraOff size={40} />
                    <Typography fontWeight={700} sx={{ maxWidth: 420 }}>{error}</Typography>
                    <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => setAttempt((value) => value + 1)}>
                        Try Again
                    </Button>
                </Box>
            )}

            {phase === 'ready' && overlay && (
                <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 1.5, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
                    {overlay}
                </Box>
            )}
        </Box>
    );
};

export default FaceCamera;
