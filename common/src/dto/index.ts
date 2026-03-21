// Data Transfer Objects (DTOs)
export interface CreateSessionPayload {
    userId: string | number;
    jobTitle: string;
    jobDescription: string;
    resume: string;
    companyName: string;
    companyPack: string;
    type: string;
    difficulty: string;
    duration: number;
}
