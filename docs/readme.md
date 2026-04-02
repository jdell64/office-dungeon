This is a good pick. It hits replayability, agent-friendly systems, and real monetization potential.

Let’s tighten it into something you can actually build.

---

# 🎮 **Office Dungeon**

**Pitch:**
A roguelike where your office is a dungeon, and your goal is to survive the workday.

---

## 🧠 Core Loop (keep this sacred)

1. Start run
2. Move tile → reveal room
3. Encounter:

   * enemy (office hazard)
   * reward
   * event
4. Make a decision
5. Gain/lose resources
6. Repeat until:

   * you burn out (lose)
   * you finish the day (win)

---

## 🗺️ Game View

![Image](https://img.craftpix.net/2020/07/2D-Top-Down-Dungeon-Tileset2.webp)

![Image](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2137250/ss_8b01268891446c29d1de30db0308d5c4f1ed5db5.1920x1080.jpg?t=1675944022)

![Image](https://img.itch.zone/aW1nLzg2ODk3NzAuZ2lm/315x250%23c/vHnfhP.gif)

![Image](https://media.indiedb.com/cache/images/games/1/18/17130/thumb_620x2000/screen24.jpg)

* Top-down grid (8x8 or 10x10)
* Fog of war
* One tile at a time movement

---

## 🧩 Core Systems (MVP)

### 1) Movement

* Tap adjacent tile
* OR swipe direction
* Turn-based (important for simplicity)

---

### 2) Player Stats (keep minimal)

* **Energy (HP)** → hits 0 = game over
* **Focus (attack power)**
* **Stress (passive debuff meter)**

Don’t add more yet.

---

### 3) Tile Types

Keep it to 4:

* Empty
* Enemy
* Reward
* Event

That’s it.

---

### 4) Combat (super simple)

No real-time combat.

**When entering enemy tile:**

```
player deals damage
enemy deals damage
repeat until one dies
```

You can literally do:

```ts
player.energy -= enemy.damage
enemy.hp -= player.focus
```

No animation needed at first.

---

## 👾 Enemy Ideas (this is where personality comes from)

![Image](https://images.cartoonstock.com/lowres/technology-printer-office_printer-3d_printer-paper_jam-jammed_paper-CS592315_low.jpg)

![Image](https://images.cartoonstock.com/lowres/families-sleep-nap-work_nap-sneaky_nap-overprotective_mother-CS587253_low.jpg)

![Image](https://dinopixel.com/preload/1022/absorbing-coffee-monstergif_1665122419.gif)

![Image](https://mcmodels.net/_ipx/_/https%3A//api.mcmodels.net/storage/product-images/15175/01K878YQPG87RHFH51R6D7AAAX.png)

Start with 3:

* **Endless Meeting**

  * high HP, low damage
* **Printer Jam**

  * medium HP, spikes damage randomly
* **Passive Aggressive Email**

  * low HP, increases stress

---

## 🎁 Rewards

Keep these simple:

* +energy (coffee)
* +focus (motivation boost)
* -stress (take a break)

---

## 🎲 Events (this is your "fun layer")

Examples:

* "Coworker vents to you"

  * +stress OR lose energy

* "Free snacks"

  * gain energy but +stress later

* "Manager compliment"

  * +focus but rare

These are just choices with outcomes.

---

## 🏁 Win Condition (MVP)

* Reach exit tile
* OR survive X turns (like 30 moves)

---

## 💀 Lose Condition

* Energy = 0

---

## 🔁 Replayability (critical)

After each run:

* score = floors cleared or turns survived

Later:

* unlock perks
* unlock enemy types
* unlock events

---

## 🧱 Suggested Architecture (Phaser)

Keep it modular so agents don’t break things:

```id="mn2l7j"
/src
  /scenes
    GameScene.ts
  /systems
    GridSystem.ts
    CombatSystem.ts
    EventSystem.ts
  /entities
    Player.ts
    Enemy.ts
  /data
    enemies.json
    events.json
    levels.json
```

---

## 🤖 Why this is PERFECT for agents

This is the key:

* Turn-based → no timing bugs
* Grid-based → simple math
* Data-driven → JSON = easy generation
* Systems are isolated

Agents can:

* generate enemies
* tweak balance
* create events
* simulate runs

---

## 🚀 First Build Plan (do this in order)

### Step 1

* Render grid
* Move player tile to tile

### Step 2

* Add 1 enemy
* Trigger combat on enter

### Step 3

* Add win/lose condition

### Step 4

* Add 1 reward tile

### Step 5

* Add 1 event

That’s your **playable game**

---

## 💰 Future Monetization Hooks

Don’t build yet, but design for:

* Characters (skins with slight stat changes)
* Perks (start with bonus)
* Ad revive
* Daily runs

---

## ⚠️ Common Mistake (don’t do this)

Do NOT:

* add inventory system yet
* add animations early
* add complex AI

You’ll kill momentum.

---

## 🔥 If you want this to stand out

Lean into humor:

* "TPS Report Boss"
* "Zoom Call From Hell"
* "Karen From HR"

That’s what makes it shareable.

---

## Bottom line

This idea is:

* simple enough for agents
* deep enough to expand
* funny enough to market

---

If you want next, I’ll give you:
👉 a **Phaser starter scene + grid system code**
👉 broken into agent-sized tasks so you can plug it into your workflow

That’s the part that actually gets this moving.
