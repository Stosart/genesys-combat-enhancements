/*
 * Genesys Combat Enhancements Module
 * Includes:
 * 1. Auto Trigger Critical Roll Hook
 * 2. Apply Damage After Attack Hook
 * 3. Drag-and-Drop Power Tier Override Hook
 * 4. Superpower Strain Application Hook
 */

Hooks.once("ready", () => {
  console.log("⚙️ [Genesys Combat Enhancements] Initializing...");

  // === 1. HOOK: AUTO TRIGGER CRITICAL ROLL ===
  Hooks.on("createChatMessage", async (message) => {
    const html = message.content;
    if (!html?.includes("Attacking with") || !html.includes("Roll Results")) return;

    const temp = document.createElement("div");
    temp.innerHTML = html;

    function extractCount(labelText) {
      const labels = [...temp.querySelectorAll(".label")];
      for (let i = 0; i < labels.length; i++) {
        if (labels[i].textContent.trim().toLowerCase() === labelText.toLowerCase()) {
          const countEl = labels[i].nextElementSibling;
          if (countEl && countEl.classList.contains("count")) {
            return parseInt(countEl.textContent.trim(), 10) || 0;
          }
        }
      }
      return 0;
    }

    const successCount = extractCount("Successes");
    const advantageCount = extractCount("Advantage");
    const triumphCount = extractCount("Triumph");
    if (successCount < 1) return;

    const weaponMatch = html.match(/Attacking with <strong>([^<]+)<\/strong>/);
    if (!weaponMatch) return;
    const weaponName = weaponMatch[1];

    const speaker = message?.speaker;
    const actor = game.actors.get(speaker?.actor) || canvas.tokens.get(speaker?.token)?.actor;
    if (!actor) return;

    const item = actor.items.find(i => i.name === weaponName);
    if (!item) return;

    const critThreshold = item.system?.critical || 1;
    const triggerCrit = triumphCount > 0 || advantageCount >= critThreshold;
    if (!triggerCrit) return;

    const bonus = Math.max(0, (triumphCount - 1) * 10);
    const table = game.tables.find(t => t.name === "General Critical Injuries");
    if (!table) return ui.notifications.warn("General Critical Injuries table not found.");

    const formula = table.formula || "1d100x>=96";
    const roll = await new Roll(formula).roll({ async: true });
    roll.total += bonus;

    const result = table.results.find(r => roll.total >= r.range[0] && roll.total <= r.range[1]);
    if (result) {
      await table.draw({ displayChat: true, roll });
    }
  });

  // === 2. HOOK: APPLY DAMAGE AFTER ATTACK ===
  Hooks.on("createChatMessage", async (message) => {
    const html = message.content;
    if (!html?.includes("Attacking with") || !html.includes("Attack Results")) return;

    const temp = document.createElement("div");
    temp.innerHTML = html;

    let successCount = 0;
    let damageValue = 0;

    const attackResultLabels = [...temp.querySelectorAll(".summary-table .label")];
    const attackResultCounts = [...temp.querySelectorAll(".summary-table .count")];

    for (let i = 0; i < attackResultLabels.length; i++) {
      const label = attackResultLabels[i].textContent.trim().toLowerCase();
      const value = parseInt(attackResultCounts[i]?.textContent.trim(), 10) || 0;
      if (label.includes("success")) successCount = value;
      if (label.includes("damage")) damageValue = value;
    }

    if (successCount <= 0 || damageValue <= 0) return;

    const targets = Array.from(game.user.targets);
    if (!targets.length) return;

    for (const target of targets) {
      const actor = target.actor;
      if (!actor) continue;

      const brawn = Number(foundry.utils.getProperty(actor, "system.characteristics.brawn")) || 0;
      let armorSoak = 0;

      for (const item of actor.items.contents) {
        if (item.type === "armor") {
          const isEquipped = foundry.utils.getProperty(item, "system.equipped") ?? true;
          const soakValue = Number(foundry.utils.getProperty(item, "system.soak")) || 0;
          if (isEquipped) armorSoak += soakValue;
        }
      }

      const soak = brawn + armorSoak;
      const wounds = Number(foundry.utils.getProperty(actor, "system.wounds.value")) || 0;
      const maxWounds = Number(foundry.utils.getProperty(actor, "system.wounds.max")) || 0;

      const appliedDamage = Math.max(0, damageValue - soak);
      const newWounds = Math.min(wounds + appliedDamage, maxWounds);

      await actor.update({ "system.wounds.value": newWounds });

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<strong>${target.name}</strong> takes <strong>${appliedDamage}</strong> damage after soak (Brawn: ${brawn}, Armor: ${armorSoak}).<br>Wounds: ${newWounds} / ${maxWounds}`
      });
    }
  });

  // === 3. HOOK: POWER DRAG/DROP TIER OVERRIDE ===
  const origAddTalent = game.genesys.ActorGen.addTalent;
  game.genesys.ActorGen.addTalent = async function (actor, talentData, options = {}) {
    const isSuperPower = (talentData.name || "").startsWith("Power - ") || talentData?.flags?.genesys?.superpower;
    if (isSuperPower) {
      console.warn("🛠️ Superpower override active for:", talentData.name);
      options.bypass = true;
    }
    return origAddTalent.call(this, actor, talentData, options);
  };
  ui.notifications.info("🧪 Power drag/drop tier override patch applied.");

  // === 4. HOOK: SUPERPOWER STRAIN DEDUCTION ===
  Hooks.on("createChatMessage", async (msg) => {
    if (!msg.content?.includes("roll-description") || !msg.content.includes("Rolling")) return;

    const match = msg.content.match(/<strong>(.*?)<\/strong>/i);
    const fullSkillText = match ? match[1].trim().toLowerCase() : null;
    if (!fullSkillText) return;

    const actorId = msg.speaker?.actor;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    let strainCost = 2;
    if (fullSkillText.includes("energy-abilities")) strainCost = 1;
    else if (fullSkillText.includes("superhuman characteristics")) strainCost = 0;
    if (strainCost === 0) return;

    const currentStrain = foundry.utils.getProperty(actor.system, "strain.value") ?? 0;
    const newStrain = Math.max(currentStrain + strainCost, 0);
    await actor.update({ "system.strain.value": newStrain });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `${actor.name} used <strong>${fullSkillText}</strong> and gains ${strainCost} strain. (Now at ${newStrain} strain)`
    });
  });
});
