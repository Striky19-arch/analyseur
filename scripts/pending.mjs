/**
 * Stub des commandes npm dont l'implémentation est prévue à une étape ultérieure
 * du canevas (canevas.md). Échoue volontairement (exit 1) pour ne jamais laisser
 * croire que l'opération a été réellement effectuée.
 *
 * Usage : node scripts/pending.mjs <ID-étape> <commande>
 */
const [, , stepId, commandName] = process.argv;

if (!stepId || !commandName) {
  console.error('Usage : node scripts/pending.mjs <ID-étape> <commande>');
  process.exit(1);
}

console.error(
  `[canevas.md] La commande « ${commandName} » n'est pas encore implémentée : ` +
    `elle est prévue à l'étape ${stepId} (voir canevas.md).`,
);
process.exit(1);
