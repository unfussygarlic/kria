const registry = new Map<string, () => void>();

export const scrollRegistry = {
  register: (name: string, fn: () => void) => registry.set(name, fn),
  unregister: (name: string) => registry.delete(name),
  scrollToTop: (name: string) => registry.get(name)?.(),
};
