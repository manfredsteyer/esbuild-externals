import * as path from 'path';

export function createSharedMappingsPlugin(mappedPaths) {
  return {
    name: 'custom',
    setup(build) {
      build.onResolve({ filter: /^[.]/ }, async (args) => {
        let mappedPath = null;
        if (
          args.path.includes('playground-lib') &&
          args.kind === 'import-statement'
        ) {
          const importPath = path.join(args.resolveDir, args.path);
          mappedPath = mappedPaths.find((p) =>
            importPath.startsWith(path.dirname(p.path))
          );
        }

        if (mappedPath) {
          return {
            path: mappedPath.key,
            external: true,
          };
        }

        return {};
      });
    },
  };
}