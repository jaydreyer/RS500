export const KEVIN_RUSSELL_EMAIL = "kevinjohnrussell422@gmail.com";

export type SignupAlbumAssignment = {
  artist: string;
  title: string;
};

export function getSignupAlbumAssignment(email: string): SignupAlbumAssignment | null {
  if (email.trim().toLowerCase() !== KEVIN_RUSSELL_EMAIL) {
    return null;
  }

  return {
    artist: "Radiohead",
    title: "The Bends",
  };
}
