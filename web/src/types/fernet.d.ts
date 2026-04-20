declare module "fernet" {
  interface FernetToken {
    encode(message?: string): string;
    decode(token?: string): string;
  }
  const Fernet: {
    Secret: new (secret64: string) => unknown;
    Token: new (opts: Record<string, unknown>) => FernetToken;
  };
  export = Fernet;
}
