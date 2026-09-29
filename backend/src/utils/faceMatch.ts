export const FACE_DESCRIPTOR_LENGTH = 128;
/**
 * face-api descriptors of the same person are usually < 0.45 apart and different
 * people > 0.6. 0.5 leans towards rejecting a scan rather than punching the wrong person.
 */
export const FACE_MATCH_THRESHOLD = 0.5;
/** Enrollment samples farther apart than this are probably not the same face. */
const ENROLLMENT_CONSISTENCY_THRESHOLD = 0.6;
/** When two employees are this close to the scan, the match is too ambiguous to trust. */
const AMBIGUITY_MARGIN = 0.04;

export const isFaceDescriptor = (value: unknown): value is number[] =>
    Array.isArray(value)
    && value.length === FACE_DESCRIPTOR_LENGTH
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));

export const euclideanDistance = (a: number[], b: number[]) => {
    let sum = 0;
    for (let index = 0; index < a.length; index += 1) {
        const diff = a[index] - b[index];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

const minDistance = (descriptor: number[], samples: number[][]) =>
    samples.reduce((best, sample) => (
        isFaceDescriptor(sample) ? Math.min(best, euclideanDistance(descriptor, sample)) : best
    ), Number.POSITIVE_INFINITY);

export interface FaceCandidate<T> {
    value: T;
    descriptors: number[][];
}

export type FaceMatchResult<T> =
    | { status: 'matched'; value: T; distance: number }
    | { status: 'no_match'; distance: number }
    | { status: 'ambiguous'; distance: number };

export const findBestFaceMatch = <T>(descriptor: number[], candidates: FaceCandidate<T>[]): FaceMatchResult<T> => {
    const ranked = candidates
        .map((candidate) => ({ value: candidate.value, distance: minDistance(descriptor, candidate.descriptors) }))
        .filter((candidate) => Number.isFinite(candidate.distance))
        .sort((a, b) => a.distance - b.distance);

    const [best, runnerUp] = ranked;
    if (!best || best.distance >= FACE_MATCH_THRESHOLD) {
        return { status: 'no_match', distance: best?.distance ?? Number.POSITIVE_INFINITY };
    }

    if (runnerUp && runnerUp.distance - best.distance < AMBIGUITY_MARGIN) {
        return { status: 'ambiguous', distance: best.distance };
    }

    return { status: 'matched', value: best.value, distance: best.distance };
};

export const areEnrollmentSamplesConsistent = (samples: number[][]) => {
    for (let i = 0; i < samples.length; i += 1) {
        for (let j = i + 1; j < samples.length; j += 1) {
            if (euclideanDistance(samples[i], samples[j]) > ENROLLMENT_CONSISTENCY_THRESHOLD) return false;
        }
    }
    return true;
};
