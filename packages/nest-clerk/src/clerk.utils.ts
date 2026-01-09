export function generateKind(event: string): string {
  const [entity] = event.split('.');

  if (!entity) {
    throw new Error('[CLERK]: Entity type is missing');
  }

  return `WEBHOOK_${entity.toUpperCase()}`;
}
