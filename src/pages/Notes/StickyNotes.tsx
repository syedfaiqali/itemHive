import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Chip,
    Tooltip,
    Divider
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Pin, Trash2, Edit3, Plus } from 'lucide-react';

type StickyNote = {
    id: string;
    title: string;
    body: string;
    color: string;
    pinned: boolean;
    updatedAt: string;
};

const STORAGE_KEY = 'itemhive_sticky_notes';

const COLOR_OPTIONS = [
    { label: 'Lemon', value: '#FDE68A' },
    { label: 'Mint', value: '#A7F3D0' },
    { label: 'Sky', value: '#BFDBFE' },
    { label: 'Peach', value: '#FBCFE8' },
    { label: 'Lavender', value: '#DDD6FE' },
];

const StickyNotes: React.FC = () => {
    const theme = useTheme();
    const [notes, setNotes] = React.useState<StickyNote[]>([]);
    const [title, setTitle] = React.useState('');
    const [body, setBody] = React.useState('');
    const [color, setColor] = React.useState(COLOR_OPTIONS[0].value);
    const [editing, setEditing] = React.useState<StickyNote | null>(null);

    React.useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as StickyNote[];
                if (Array.isArray(parsed)) setNotes(parsed);
            }
        } catch {
            setNotes([]);
        }
    }, []);

    React.useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        } catch {
            // ignore storage errors
        }
    }, [notes]);

    const sortedNotes = React.useMemo(() => {
        return [...notes].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [notes]);

    const handleAdd = () => {
        if (!title.trim() && !body.trim()) return;
        const now = new Date().toISOString();
        const newNote: StickyNote = {
            id: Math.random().toString(36).slice(2, 10),
            title: title.trim() || 'Untitled',
            body: body.trim(),
            color,
            pinned: false,
            updatedAt: now
        };
        setNotes(prev => [newNote, ...prev]);
        setTitle('');
        setBody('');
        setColor(COLOR_OPTIONS[0].value);
    };

    const handleTogglePin = (id: string) => {
        setNotes(prev => prev.map(note => (
            note.id === id
                ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() }
                : note
        )));
    };

    const handleDelete = (id: string) => {
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    const handleEditSave = () => {
        if (!editing) return;
        setNotes(prev => prev.map(note => (
            note.id === editing.id
                ? { ...editing, title: editing.title.trim() || 'Untitled', body: editing.body.trim(), updatedAt: new Date().toISOString() }
                : note
        )));
        setEditing(null);
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800}>Sticky Notes</Typography>
                <Typography variant="body2" color="text.secondary">
                    Quick notes for reminders, supplier calls, or urgent tasks.
                </Typography>
            </Box>

            <Card sx={{ borderRadius: 4, mb: 4, overflow: 'hidden' }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={800} gutterBottom>
                        Add a Note
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                fullWidth
                                label="Note"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid size={12}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                {COLOR_OPTIONS.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        onClick={() => setColor(option.value)}
                                        sx={{
                                            bgcolor: alpha(option.value, 0.7),
                                            border: color === option.value ? '2px solid' : '1px solid',
                                            borderColor: color === option.value ? theme.palette.primary.main : 'divider',
                                            fontWeight: 700
                                        }}
                                    />
                                ))}
                                <Box sx={{ flexGrow: 1 }} />
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={handleAdd}
                                    sx={{ borderRadius: 2, fontWeight: 800 }}
                                >
                                    Add Note
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {sortedNotes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No notes yet. Add your first sticky note above.
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {sortedNotes.map((note) => (
                        <Grid key={note.id} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    borderRadius: 4,
                                    height: '100%',
                                    bgcolor: alpha(note.color, 0.65),
                                    border: '1px solid',
                                    borderColor: alpha(note.color, 0.8),
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" fontWeight={900}>
                                            {note.title}
                                        </Typography>
                                        <Tooltip title={note.pinned ? 'Unpin' : 'Pin'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleTogglePin(note.id)}
                                                sx={{
                                                    bgcolor: note.pinned ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                                }}
                                            >
                                                <Pin size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                                        {note.body || '—'}
                                    </Typography>
                                    <Divider sx={{ mb: 1.5, borderColor: alpha('#000', 0.08) }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Updated: {new Date(note.updatedAt).toLocaleString()}
                                        </Typography>
                                        <Box>
                                            <IconButton size="small" onClick={() => setEditing(note)}>
                                                <Edit3 size={16} />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(note.id)}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Edit Note</DialogTitle>
                <DialogContent>
                    {editing && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={editing.title}
                                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Note"
                                value={editing.body}
                                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                                multiline
                                rows={4}
                            />
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {COLOR_OPTIONS.map((option) => (
                                    <Chip
                                        key={option.value}
                                        label={option.label}
                                        onClick={() => setEditing({ ...editing, color: option.value })}
                                        sx={{
                                            bgcolor: alpha(option.value, 0.7),
                                            border: editing.color === option.value ? '2px solid' : '1px solid',
                                            borderColor: editing.color === option.value ? theme.palette.primary.main : 'divider',
                                            fontWeight: 700
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" onClick={handleEditSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default StickyNotes;
