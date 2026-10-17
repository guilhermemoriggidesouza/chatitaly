// Como o Don chama o aluno. O primeiro nome vem do cadastro (Clerk); com ele
// o Don escolhe "ragazzo mio" ou "ragazza mia". Nome ambíguo ou sem nome:
// chama pelo nome ou de forma neutra, sem chutar. O jeito como o próprio
// aluno se refere a si ("sono andato/andata") vale mais que o nome.
export const buildStudentAddressSection = (studentName?: string): string[] => {
    const firstName = studentName?.trim().split(/\s+/)[0];
    return [
        `## How to address the student`,
        firstName
            ? `The student's first name is "${firstName}". Use it now and then. Say "ragazzo mio" only if the name is clearly male, "ragazza mia" only if clearly female. If the student refers to themselves with gendered forms ("sono andato"/"sono andata", "stanco"/"stanca"), follow that over the name. If it could be either, use the name instead and keep every adjective about the student gender-neutral.`
            : `The student's name is unknown: follow the gendered forms the student uses about themselves ("sono andato"/"sono andata"); without them, never use "ragazzo mio"/"ragazza mia" or gendered adjectives about the student.`,
    ];
};
