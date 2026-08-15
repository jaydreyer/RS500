export function shouldShowFeedAlbumCard({
  albumCoverImage,
  currentAlbumCoverImage,
  hasImage,
  imageIsAlbumCover,
}: {
  albumCoverImage: string | null;
  currentAlbumCoverImage: string;
  hasImage: boolean;
  imageIsAlbumCover: boolean;
}) {
  if (!hasImage) {
    return true;
  }

  return !imageIsAlbumCover || albumCoverImage !== currentAlbumCoverImage;
}
