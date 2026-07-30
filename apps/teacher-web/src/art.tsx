export function PortScene() {
  return (
    <svg
      className="port-scene"
      viewBox="0 0 760 360"
      role="img"
      aria-label="港口、集装箱岸桥与货轮插画"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="portSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f4b66" />
          <stop offset="62%" stopColor="#19788a" />
          <stop offset="100%" stopColor="#9fd7cc" />
        </linearGradient>
        <linearGradient id="portWater" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a6078" />
          <stop offset="100%" stopColor="#063e5d" />
        </linearGradient>
        <linearGradient id="shipHull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7f2e7" />
          <stop offset="100%" stopColor="#cbdde1" />
        </linearGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect width="760" height="360" fill="url(#portSky)" />
      <circle cx="620" cy="72" r="68" fill="#d8fff2" opacity=".18" filter="url(#softGlow)" />
      <circle cx="620" cy="72" r="34" fill="#eafff7" opacity=".35" />
      <path d="M0 190 C130 168 205 205 326 186 C450 166 610 166 760 188 V244 H0Z" fill="#0a4c61" opacity=".62" />
      <g opacity=".75" fill="#d4f2ed">
        <rect x="40" y="121" width="4" height="76" />
        <path d="M42 123 L106 101 L107 106 L51 132Z" />
        <rect x="102" y="99" width="4" height="97" />
        <rect x="135" y="107" width="4" height="89" />
        <path d="M137 109 L196 92 L198 97 L145 118Z" />
        <rect x="194" y="91" width="4" height="105" />
      </g>
      <g transform="translate(80 174)">
        <rect width="44" height="20" rx="2" fill="#f16f5b" />
        <rect x="48" width="44" height="20" rx="2" fill="#f5ad4b" />
        <rect x="96" width="44" height="20" rx="2" fill="#3bb3ad" />
        <rect x="20" y="-23" width="44" height="20" rx="2" fill="#f5ad4b" />
        <rect x="68" y="-23" width="44" height="20" rx="2" fill="#f16f5b" />
      </g>
      <rect y="222" width="760" height="138" fill="url(#portWater)" />
      <g opacity=".19" stroke="#b9f4ee" strokeWidth="3">
        <path d="M0 258 C85 242 145 273 226 255 S380 247 466 263 S620 245 760 257" fill="none" />
        <path d="M0 301 C90 287 150 318 254 298 S430 296 520 308 S650 288 760 301" fill="none" />
        <path d="M48 333 C128 320 212 342 304 328 S472 333 558 326 S686 326 760 337" fill="none" />
      </g>
      <g transform="translate(262 166)">
        <path d="M0 62 H395 L356 122 H54 L20 99Z" fill="#092f4b" />
        <path d="M25 21 H325 L372 62 H0Z" fill="url(#shipHull)" />
        <rect x="76" y="-2" width="47" height="23" fill="#f26f5b" />
        <rect x="128" y="-2" width="47" height="23" fill="#e9a645" />
        <rect x="180" y="-2" width="47" height="23" fill="#2ea59f" />
        <rect x="102" y="-30" width="47" height="25" fill="#2ea59f" />
        <rect x="154" y="-30" width="47" height="25" fill="#f26f5b" />
        <path d="M282 -18 H331 L344 21 H268Z" fill="#eef7f5" />
        <rect x="294" y="-34" width="16" height="16" fill="#dbeceb" />
        <rect x="312" y="-34" width="13" height="16" fill="#c8dedf" />
        <rect x="300" y="-54" width="5" height="20" fill="#dbeceb" />
        <path d="M303 -53 L333 -40" stroke="#dbeceb" strokeWidth="3" />
        <g fill="#0b6075">
          <circle cx="291" cy="2" r="4" />
          <circle cx="307" cy="2" r="4" />
          <circle cx="323" cy="2" r="4" />
        </g>
      </g>
      <g opacity=".5" fill="#d8f4f0">
        <path d="M18 82 q16 -14 32 0 q16 -14 32 0 q-16 -7 -32 3 q-16 -10 -32 -3" />
        <path d="M244 63 q13 -11 26 0 q13 -11 26 0 q-13 -6 -26 3 q-13 -9 -26 -3" />
      </g>
    </svg>
  );
}

export function HarborAssistant() {
  return (
    <svg
      className="assistant-character"
      viewBox="0 0 260 230"
      role="img"
      aria-label="戴船长帽的卡通港航教学助手"
    >
      <defs>
        <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#43d4c2" />
          <stop offset="100%" stopColor="#149b9d" />
        </linearGradient>
      </defs>
      <ellipse cx="133" cy="207" rx="80" ry="13" fill="#063c5b" opacity=".12" />
      <path d="M58 178 C58 130 88 105 130 105 C174 105 203 132 201 180 L187 205 H72Z" fill="url(#bodyGradient)" />
      <path d="M91 114 C87 157 102 181 132 182 C162 181 177 156 171 113Z" fill="#f2c9a5" />
      <ellipse cx="131" cy="92" rx="55" ry="62" fill="#f4cfad" />
      <path d="M78 86 C83 40 103 24 134 24 C169 24 184 48 185 88 C169 73 158 68 140 68 C119 70 99 77 78 86Z" fill="#173d59" />
      <path d="M88 44 C93 16 115 5 138 7 C161 8 178 22 181 47Z" fill="#f5f0e5" />
      <path d="M82 44 H188 L178 66 H90Z" fill="#0a4b67" />
      <circle cx="135" cy="30" r="10" fill="#eab248" />
      <path d="M135 20 V40 M125 30 H145" stroke="#0a4b67" strokeWidth="3" />
      <ellipse cx="108" cy="96" rx="7" ry="9" fill="#17334a" />
      <ellipse cx="154" cy="96" rx="7" ry="9" fill="#17334a" />
      <circle cx="106" cy="93" r="2" fill="white" />
      <circle cx="152" cy="93" r="2" fill="white" />
      <path d="M113 120 Q132 137 153 119" fill="none" stroke="#a9564f" strokeWidth="5" strokeLinecap="round" />
      <circle cx="88" cy="111" r="10" fill="#efad9f" opacity=".5" />
      <circle cx="173" cy="111" r="10" fill="#efad9f" opacity=".5" />
      <path d="M69 145 C36 125 29 98 42 83 C55 69 73 83 67 98 C60 112 49 103 51 93" fill="none" stroke="#1eb2a9" strokeWidth="17" strokeLinecap="round" />
      <circle cx="45" cy="78" r="16" fill="#f4cfad" />
      <path d="M37 76 Q45 66 54 76" fill="none" stroke="#173d59" strokeWidth="3" />
      <rect x="113" y="161" width="38" height="45" rx="7" fill="#f8fbf8" />
      <path d="M132 164 V202 M118 182 H146" stroke="#0c5871" strokeWidth="4" />
      <path d="M76 202 H188" stroke="#0d7583" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
