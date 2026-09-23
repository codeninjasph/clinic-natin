import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#32bea6',
                    dark: '#259682',
                    50: '#eefaf7',
                    100: '#d4f5ee',
                    200: '#a9ecdf',
                    300: '#7ae1ce',
                    400: '#4bd2bc',
                    500: '#32bea6',
                    600: '#2bac96',
                    700: '#259682',
                    800: '#1d7667',
                    900: '#15564b',
                },
                dark: {
                    DEFAULT: '#1A1A1A',
                    muted: '#6C757D',
                },
                surface: '#FFFFFF',
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;