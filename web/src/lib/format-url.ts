/** Remove the HTTP(S) prefix and path for compact URL labels. */
export function formatUrlDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").split("/")[0];
}
