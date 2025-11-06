const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  "accountAssociation": {
    "header": "eyJmaWQiOjQxMTEyNiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDY1MGYzYzAwOUJFZDAwRTMzRTM5REUwM2NENEFDQTZlYjM0MGZEOGEifQ",
    "payload": "eyJkb21haW4iOiJwZWctc29saXRhaXJlLWJldGEudmVyY2VsLmFwcCJ9",
    "signature": "E9e9t/L8VTVzWiHNFZb6PRmXOz1rL4UIwO0zxZFJ7MYSAObjRwarQ5PnEqntN1bxsZqXIEgjujObbyC28YRYcRw="
  },
  miniapp: {
    version: "1",
    name: "Peg Solitaire", 
    subtitle: "Jump & eliminate pegs", 
    description: "Remove all but one",
    screenshotUrls: [`${ROOT_URL}/logo.png`],
    iconUrl: `${ROOT_URL}/logo.png`,
    splashImageUrl: `${ROOT_URL}/logo.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["game", "puzzle", "strategy", "classic", "solo"],
    heroImageUrl: `${ROOT_URL}/logo.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/logo.png`,
  },
} as const;