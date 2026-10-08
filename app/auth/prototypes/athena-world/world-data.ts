export const places = [
  { id: "language", title: "Language House", short: "Language", guide: "Mina", role: "Your language guide", color: "#567e92", roof: 0x456e83, x: -10, z: -6, detail: "Sounds, stories & conversations", greeting: "Welcome in. Which language would you like to explore together?" },
  { id: "movement", title: "Movement Garden", short: "Movement", guide: "Sam", role: "Your movement guide", color: "#8a7649", roof: 0x897c49, x: 0, z: -11, detail: "Movement, balance & body awareness", greeting: "Good to see you. Let’s find something that fits your day." },
  { id: "discovery", title: "Discovery Workshop", short: "Discovery", guide: "Theo", role: "Your discovery guide", color: "#b07147", roof: 0xae7048, x: 10, z: -6, detail: "Curiosity & making connections", greeting: "There’s always something to wonder about. What has caught your child’s attention?" },
  { id: "connection", title: "Connection Cottage", short: "Connection", guide: "Ada", role: "Your connection guide", color: "#7e7393", roof: 0x827795, x: -11, z: 6, detail: "Feelings, relationships & belonging", greeting: "Come and sit a while. We can start with what’s on your mind." },
  { id: "creative", title: "Creative Studio", short: "Creative", guide: "Remy", role: "Your creative guide", color: "#548573", roof: 0x548573, x: 11, z: 6, detail: "Expression, imagination & play", greeting: "Welcome to the studio. Let’s follow a little curiosity today." },
] as const;
export type Place = typeof places[number];
export type PlaceId = Place["id"];
export type WorldState = { room: PlaceId | null; near: string | null; moving: boolean };
export type WorldController = { travel: (id: string) => void; interact: () => void; exit: () => void; key: (key: string, down: boolean) => void; setWide: (wide: boolean) => void; setAmbient: (enabled: boolean) => void; dispose: () => void };
