import React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import { Camera, CheckCircle2, RotateCcw } from 'lucide-react';
import FaceCamera, { type FaceCameraTone } from './FaceCamera';
import { captureFaceSnapshot, type DetectedFace } from '../../lib/faceRecognition';

const SAMPLE_COUNT = 5;
const SAMPLE_GAP_MS = 500;
const MIN_SAMPLE_SCORE = 0.7;

export interface FaceEnrollmentResult {
    descriptors: number[][];
    photo: string;
}

interface FaceEnrollmentDialogProps {
    open: boolean;
    employeeName: string;
    onClose: () => void;
    onComplete: (result: FaceEnrollmentResult) => void;
}

const describeFrame = (faces: DetectedFace[]) => {
    if (faces.length === 0) return { text: 'No face detected. Look straight at the camera.', ok: false };
    if (faces.length > 1) return { text: 'Only the employee should be in front of the camera.', ok: false };
    if (!faces[0].isCloseEnough) return { text: 'Move a little closer to the camera.', ok: false };
    if (faces[0].score < MIN_SAMPLE_SCORE) return { text: 'Hold still with your face well lit.', ok: false };
    return { text: 'Face detected.', ok: true };
};

const FaceEnrollmentDialog: React.FC<FaceEnrollmentDialogProps> = ({ open, employeeName, onClose, onComplete }) => {
    const [capturing, setCapturing] = React.useState(false);
    const [samples, setSamples] = React.useState<number[][]>([]);
    const [photo, setPhoto] = React.useState('');
    const [hint, setHint] = React.useState({ text: 'Position the face inside the frame.', ok: false });
    const capturingRef = React.useRef(false);
    const samplesRef = React.useRef<number[][]>([]);
    const lastSampleAtRef = React.useRef(0);
    const bestScoreRef = React.useRef(0);

    const reset = React.useCallback(() => {
        capturingRef.current = false;
        samplesRef.current = [];
        lastSampleAtRef.current = 0;
        bestScoreRef.current = 0;
        setCapturing(false);
        setSamples([]);
        setPhoto('');
    }, []);

    React.useEffect(() => {
        if (open) reset();
    }, [open, reset]);

    const handleDetect = React.useCallback((faces: DetectedFace[], video: HTMLVideoElement) => {
        const frame = describeFrame(faces);
        setHint(frame);
        if (!capturingRef.current || !frame.ok) return;

        const now = Date.now();
        if (now - lastSampleAtRef.current < SAMPLE_GAP_MS) return;
        lastSampleAtRef.current = now;

        const [face] = faces;
        if (face.score > bestScoreRef.current) {
            bestScoreRef.current = face.score;
            setPhoto(captureFaceSnapshot(video, face.box, 240, 0.82));
        }
        samplesRef.current = [...samplesRef.current, face.descriptor];
        setSamples(samplesRef.current);
        if (samplesRef.current.length >= SAMPLE_COUNT) {
            capturingRef.current = false;
            setCapturing(false);
        }
    }, []);

    const startCapture = () => {
        reset();
        capturingRef.current = true;
        setCapturing(true);
    };

    const isComplete = samples.length >= SAMPLE_COUNT;
    const tone: FaceCameraTone = isComplete ? 'success' : hint.ok ? 'success' : capturing ? 'warning' : 'neutral';

    return (
        <Dialog open={open} onClose={capturing ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Register Face{employeeName ? ` - ${employeeName}` : ''}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Ask the employee to look at the camera in good light. While capturing, they should turn their head slightly left and right so
                    the scanner learns the face from a few angles.
                </Typography>

                {open && (
                    <FaceCamera
                        onDetect={handleDetect}
                        paused={isComplete}
                        tone={tone}
                        overlay={<Typography variant="body2" fontWeight={700}>{hint.text}</Typography>}
                    />
                )}

                <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" fontWeight={700}>
                            {isComplete ? 'Face captured' : capturing ? 'Capturing samples...' : 'Ready to capture'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{samples.length} / {SAMPLE_COUNT}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(samples.length / SAMPLE_COUNT) * 100} color={isComplete ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
                </Box>

                {isComplete && (
                    <Alert icon={<CheckCircle2 size={20} />} severity="success" sx={{ mt: 2, alignItems: 'center' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            {photo && <Box component="img" src={photo} alt="Captured face" sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover' }} />}
                            <Typography variant="body2">Face samples are ready. Save the profile to register this face for attendance.</Typography>
                        </Stack>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button variant="outlined" onClick={onClose} disabled={capturing}>Cancel</Button>
                {isComplete ? (
                    <>
                        <Button startIcon={<RotateCcw size={16} />} onClick={startCapture}>Retake</Button>
                        <Button variant="contained" startIcon={<CheckCircle2 size={18} />} onClick={() => onComplete({ descriptors: samples, photo })}>
                            Use This Face
                        </Button>
                    </>
                ) : (
                    <Button variant="contained" startIcon={<Camera size={18} />} onClick={startCapture} disabled={capturing}>
                        {capturing ? 'Capturing...' : 'Start Capture'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default FaceEnrollmentDialog;
