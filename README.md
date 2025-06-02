# Genesys Combat Enhancements

A Foundry VTT module that adds powerful automation to Genesys RPG gameplay. This collection of hooks triggers key combat functionality during chat messages, reducing bookkeeping and improving game flow.

## Features

### ✅ Auto Trigger Critical Rolls
- Automatically rolls on the **General Critical Injuries** table when a weapon attack meets its critical threshold (advantage or triumph).
- Parses chat DOM to ensure high reliability and compatibility with Foundry v12.

### ✅ Apply Damage After Attack
- Automatically applies damage to selected targets after accounting for total soak (Brawn + equipped armor).
- Posts a chat message summarizing the damage and updated wound total.

### ✅ Power Tier Override
- Enables drag-and-drop of Superpower talents without requiring lower-tier prerequisite powers.
- Detects powers via name prefix (`Power -`) or `genesys.superpower` flag.

### ✅ Superpower Strain Deduction
- Automatically adds strain based on the category of power used in a skill check:
  - **Energy-Abilities** → 1 strain
  - **Superhuman Characteristics** → 0 strain
  - All others → 2 strain
- Displays a message summarizing the strain gained.

## Installation

To install manually:

1. Download or clone this repository.
2. Move the folder to your Foundry VTT `modules` directory.
3. Enable the module in your world’s configuration.

## Compatibility

- Requires Foundry VTT v10–v12
- Built for the Genesys RPG system

## License

MIT License — Use freely, modify responsibly.
