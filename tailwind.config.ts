import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Màu thương hiệu VivaTrip (theo logo): đỏ san hô + cam đào
        paper: "#FBF8F5",
        "paper-dim": "#F3EEE8",
        ink: "#1B211F",
        "ink-muted": "#4F5953",
        // Giữ tên "teal" để không phải sửa hàng trăm chỗ — giá trị là màu chính của logo
        teal: {
          DEFAULT: "#EF4F58",
          dark: "#C7353F",
          light: "#FFEDEE",
        },
        sand: {
          DEFAULT: "#EDA36B",
          light: "#FDF1E6",
          dark: "#9C5820",
        },
        border: "#EAE3DB",
        // Đỏ nổi bật — tô dòng giá đúng ngày khách hỏi
        hot: {
          DEFAULT: "#D42A2A",
          light: "#FFE9E7",
        },
        // Cam san hô — nhãn chiết khấu
        coral: {
          DEFAULT: "#EE8A3C",
          light: "#FFF1E4",
        },
        danger: {
          DEFAULT: "#B3402A",
          light: "#F5E4DF",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        // Quicksand: chữ tròn, giống nét logo VivaTrip — dùng cho tiêu đề
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(27, 33, 31, 0.04), 0 1px 8px -2px rgba(27, 33, 31, 0.06)",
        float: "0 8px 24px -6px rgba(27, 33, 31, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
