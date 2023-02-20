import Publicodes, { formatValue } from "npm:publicodes";
import modeleSocial from "npm:modele-social";
import { parse } from "npm:yaml";

const partsDividendesATester = [0, 20, 95, 100];

const extraRules = `
montant à distribuer: ${Deno.args[0] || 100000} €/an
part dividendes: 50%
part rémunération gérance: 100% - part dividendes

rémunération gérance nette: dirigeant . rémunération . net . après impôt + impôt . dividendes . PFU
rémunération nette:
    description: le montant final reçu après IS, IR et cotisations, que l'on cherche à maximiser
    valeur: rémunération gérance nette + bénéficiaire . dividendes . nets d'impôt
`;

const logger = {
  warn: () => {},
};
const engine = new Publicodes(
  { ...modeleSocial, ...parse(extraRules) },
  { logger }
);

engine.setSituation({
  "entreprise . activité . nature . libérale . réglementée": "non",
  "dirigeant . indépendant": "oui",
  "dirigeant . indépendant . PL . métier": "'rattaché CIPAV'",
  "entreprise . activité . nature": "'libérale'",
  "entreprise . chiffre d'affaires":
    "part rémunération gérance * montant à distribuer",
  "entreprise . catégorie juridique": "'EURL'",
  "entreprise . imposition": "'IS'",
  "entreprise . imposition . IS . éligible taux réduit": "oui",
  "entreprise . imposition . IS . résultat imposable":
    "part dividendes * montant à distribuer",
  "impôt . méthode de calcul . PFU": "oui",
  bénéficiaire: "oui",
  "bénéficiaire . dividendes . bruts":
    "entreprise . imposition . IS . résultat imposable - entreprise . imposition . IS . montant",
  "bénéficiaire . dividendes . imposables": "0 €/mois",
});

const lines = [
  ["montant à distribuer", "montant à distribuer"],
  ["part dividendes", "part dividendes"],
  ["rémunération gérance totale", "dirigeant . rémunération . totale"],
  [
    "bénéfice brut société",
    "entreprise . imposition . IS . résultat imposable",
  ],
  ["-----"],
  [
    "cotisations sur rémunération",
    "dirigeant . indépendant . cotisations et contributions",
  ],
  ["IR", "impôt . montant"],
  ["(A) rémunération gérance nette", "rémunération gérance nette"],
  ["-----"],
  ["IS", "entreprise . imposition . IS . montant"],
  ["PFU", "impôt . dividendes . PFU"],
  ["(B) dividende net", "bénéficiaire . dividendes . nets d'impôt"],
  ["-----"],
  ["rémunération nette (A+B)", "rémunération nette"],
];

const results = partsDividendesATester.map((partDividendes) => {
  engine.setSituation(
    { "part dividendes": `${partDividendes}%` },
    { keepPreviousSituation: true }
  );

  return Object.fromEntries(
    lines
      .filter(([, ruleName]) => Boolean(ruleName))
      .map(([, ruleName]) => [ruleName, engine.evaluate(ruleName)])
  );
});

// Rémunération nette

console.table(
  lines.map(([label, ruleName]) => [
    label,
    ...results.map((res) =>
      ruleName ? formatValue(res[ruleName]).replace(" / an", "") : label
    ),
  ])
);
