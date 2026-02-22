import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function loadModules(client) {
      const modulesPath = path.join(__dirname, "../modules");
        if (!fs.existsSync(modulesPath)) return;

          const folders = fs
              .readdirSync(modulesPath)
                  .filter(f => fs.statSync(path.join(modulesPath, f)).isDirectory());

                    const imports = folders.map(folder =>
                        import(pathToFileURL(path.join(modulesPath, folder, "index.js")).href)
                          );

                            const loadedModules = await Promise.all(imports);

                              loadedModules.forEach((mod, index) => {
                                    const moduleName = folders[index];
                                        if (typeof mod.default === "function") {
                                                  client[moduleName] = mod.default(client);
                                        } else if (typeof mod.default === "object") {
                                                  client[moduleName] = mod.default;
                                        }
                              });
}
