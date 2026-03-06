export function isAfastadoLikeStatus(status: string | null | undefined): boolean {
  return status === "afastado" || status === "atestado";
}
