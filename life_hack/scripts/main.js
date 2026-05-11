import { world, system } from "@minecraft/server";

/* =========================================
   SETTINGS
========================================= */

const MATRIX_CHARS =
"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@";

/* =========================================
   8 TERMINAL MODES
========================================= */

const TERMINALS = {

    hack1: [
        "Kutu no naka Juendama de shoshukouka ari."
    ],

    hack2: [
        "Nemurenaitoki 'BEIGUNSHIKI' deneruto yoi."
    ],

    hack3: [
        "Natto film hashi de kurukuru de tewoyogosazu torihazushi kanou."
    ],

    hack4: [
        "Ugokanai chakku ni enpitunuruto nurunuru."
    ],

    hack5: [
        "Kanisasaretara 50℃ jakuno oyu ni hitasuto kayumi tomaru."
    ],

    hack6: [
        "Pizza atatamenaosutoki koppuippai no mizu isshoni ireruto kijino MotiMoti ga fukkatu."
    ],

    hack7: [
        "Seetaa no kedamatori sponji tukauto yoi."
    ],

    hack8: [
        "Ofuro no kagami ni ekitainori nuruto kumoranakunaru."
    ]
};

/* =========================================
   DISPLAY SIZE
========================================= */

const WIDTH = 42;
const HEIGHT = 14;

/* =========================================
   PLAYER DATA
========================================= */

const activePlayers = new Map();

/* =========================================
   RANDOM CHAR
========================================= */

function randomChar() {

    return MATRIX_CHARS[
        Math.floor(
            Math.random() *
            MATRIX_CHARS.length
        )
    ];
}

/* =========================================
   CREATE COLUMNS
========================================= */

function createColumns() {

    const cols = [];

    for (let x = 0; x < WIDTH; x++) {

        cols.push({

            y: Math.floor(
                Math.random() * HEIGHT
            ),

            speed:
                Math.floor(
                    Math.random() * 4
                ) + 2
        });
    }

    return cols;
}

/* =========================================
   MATRIX GENERATION
========================================= */

function generateMatrix(columns, color) {

    const screen = [];

    for (let y = 0; y < HEIGHT; y++) {

        screen[y] = [];

        for (let x = 0; x < WIDTH; x++) {

            screen[y][x] = " ";
        }
    }

    for (let x = 0; x < WIDTH; x++) {

        const col = columns[x];

        col.y += col.speed;

        const trail = 8;

        for (let i = 0; i < trail; i++) {

            const yy = col.y - i;

            if (yy >= 0 && yy < HEIGHT) {

                const char = randomChar();

                if (i === 0) {

                    screen[yy][x] =
                        `§f${char}${color}`;

                } else {

                    screen[yy][x] = char;
                }
            }
        }

        if (col.y - trail > HEIGHT) {

            col.y = 0;
        }
    }

    return screen;
}

/* =========================================
   LONG TEXT SCROLL
========================================= */

function scrollText(text, tick, width) {

    const padding =
        " ".repeat(width);

    const full =
        padding + text + padding;

    const start =
        tick % full.length;

    return full.substring(
        start,
        start + width
    );
}

/* =========================================
   TERMINAL OVERLAY
========================================= */

function overlayTerminal(
    screen,
    text,
    color
) {

    const row =
        Math.floor(HEIGHT / 2);

    const startX =
        Math.floor(
            (WIDTH - text.length) / 2
        );

    for (let i = 0; i < text.length; i++) {

        const x = startX + i;

        if (x >= 0 && x < WIDTH) {

            screen[row][x] =
                `${color}${text[i]}${color}`;
        }
    }
}

/* =========================================
   SCREEN TO STRING
========================================= */

function screenToString(screen) {

    return screen
        .map(row => row.join(""))
        .join("\n");
}

/* =========================================
   STOP
========================================= */

function stopTerminal(player) {

    const data =
        activePlayers.get(player.id);

    if (!data) return;

    system.clearRun(data.renderRun);

    player.onScreenDisplay.clearTitle();

    player.runCommandAsync(
        "effect @s clear"
    );

    activePlayers.delete(player.id);
}

/* =========================================
   START
========================================= */

function startTerminal(
    player,
    terminalLines,
    color,
    soundPitch
) {

    if (activePlayers.has(player.id))
        return;

    const columns =
        createColumns();

    let mode = "matrix";

    let modeTick = 0;

    let terminalLine =
        terminalLines[
            Math.floor(
                Math.random() *
                terminalLines.length
            )
        ];

    player.runCommandAsync(
        "effect @s darkness 999999 1 true"
    );

    const renderRun =
        system.runInterval(() => {

        // 全hackタグ無くなったら停止
        const hasHackTag =
            Object.keys(TERMINALS)
            .some(tag =>
                player.hasTag(tag)
            );

        if (!hasHackTag) {

            stopTerminal(player);
            return;
        }

        const screen =
            generateMatrix(
                columns,
                color
            );

        /* =========================
           MATRIX MODE
        ========================= */

        if (mode === "matrix") {

            player.runCommandAsync(
`playsound random.click @s ~~~ 0.15 ${soundPitch}`
            );

            modeTick++;

            if (modeTick > 40) {

                mode = "terminal";
                modeTick = 0;

                terminalLine =
                    terminalLines[
                        Math.floor(
                            Math.random() *
                            terminalLines.length
                        )
                    ];
            }
        }

        /* =========================
           TERMINAL MODE
        ========================= */

        else {

            const visibleText =
                scrollText(
                    terminalLine,
                    Math.floor(modeTick / 2),
                    WIDTH - 4
                );

            overlayTerminal(
                screen,
                visibleText,
                color
            );

            if (modeTick % 200 === 0) {

                player.runCommandAsync(
                    'playsound note.bass @s ~~~ 0.2 0.4'
                );

                player.runCommandAsync(
                    'playsound note.bass @s ~~~ 0.4 0.6'
                );
            }

            modeTick++;

            if (modeTick > 200) {

                mode = "matrix";
                modeTick = 0;
            }
        }

        player.onScreenDisplay.setTitle(
`${color}${screenToString(screen)}`,
            {
                stayDuration: 2,
                fadeInDuration: 0,
                fadeOutDuration: 0
            }
        );

    }, 1);

    activePlayers.set(player.id, {
        renderRun
    });
}

/* =========================================
   TAG WATCHER
========================================= */

system.runInterval(() => {

    for (const player of world.getPlayers()) {

        // 既に起動中ならスキップ
        if (activePlayers.has(player.id))
            continue;

        /* =========================
           8 TAGS
        ========================= */

        if (player.hasTag("hack1")) {

            startTerminal(
                player,
                TERMINALS.hack1,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack2")) {

            startTerminal(
                player,
                TERMINALS.hack2,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack3")) {

            startTerminal(
                player,
                TERMINALS.hack3,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack4")) {

            startTerminal(
                player,
                TERMINALS.hack4,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack5")) {

            startTerminal(
                player,
                TERMINALS.hack5,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack6")) {

            startTerminal(
                player,
                TERMINALS.hack6,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack7")) {

            startTerminal(
                player,
                TERMINALS.hack7,
                "§2",
                2
            );
        }

        else if (player.hasTag("hack8")) {

            startTerminal(
                player,
                TERMINALS.hack8,
                "§2",
                2
            );
        }
    }

}, 1);