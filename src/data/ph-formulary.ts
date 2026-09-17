/**
 * Philippine National Formulary — Essential Medicines Formulary
 * Sourced from: DOH Essential Medicines List (EML), MIMS Philippines, FDA-registered generics.
 * Covers the most commonly prescribed drugs in Cagayan de Oro primary-care and specialist clinics.
 *
 * Dangerous Drug (DD) Classification:
 *   - is_s2 = true → Requires S2 yellow prescription pad (Dangerous Drugs Board classification)
 *   - is_controlled = true → Regulated prescribing (e.g., psychotropics, Schedule III/IV)
 */

export interface PhDrug {
  genericName: string;
  brandNames: string[]; // Philippine market brand names
  dosageForms: string[]; // e.g., 'Tab', 'Cap', 'Syrup', 'Inj', 'Cream'
  strengths: string[]; // e.g., '500mg', '250mg/5mL'
  category: string; // ATC therapeutic group
  is_s2: boolean; // DDB Schedule II / S2 License required
  is_controlled: boolean; // Psychotropic / Schedule III-IV
}

export const PH_FORMULARY: PhDrug[] = [
  // ── ANALGESICS / ANTIPYRETICS ──────────────────────────────────────────────
  {
    genericName: 'Paracetamol (Acetaminophen)',
    brandNames: ['Biogesic', 'Tempra', 'Tylenol', 'Medicol', 'Panadol'],
    dosageForms: ['Tab', 'Cap', 'Syrup', 'Drops', 'Suppository'],
    strengths: ['500mg', '325mg', '250mg/5mL', '120mg/5mL', '80mg drops'],
    category: 'Analgesic / Antipyretic',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Ibuprofen',
    brandNames: ['Advil', 'Motrin', 'Dolfenal', 'Nuprin'],
    dosageForms: ['Tab', 'Cap', 'Suspension'],
    strengths: ['200mg', '400mg', '600mg', '100mg/5mL'],
    category: 'NSAID',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Mefenamic Acid',
    brandNames: ['Ponstan', 'Dolfenal', 'Ponstel'],
    dosageForms: ['Cap', 'Tab', 'Suspension'],
    strengths: ['250mg', '500mg'],
    category: 'NSAID',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Celecoxib',
    brandNames: ['Celebrex'],
    dosageForms: ['Cap'],
    strengths: ['100mg', '200mg'],
    category: 'COX-2 Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Tramadol',
    brandNames: ['Tramal', 'Tradol', 'Ultram'],
    dosageForms: ['Cap', 'Tab', 'Inj'],
    strengths: ['50mg', '100mg'],
    category: 'Opioid Analgesic',
    is_s2: true,
    is_controlled: false,
  },
  {
    genericName: 'Morphine Sulfate',
    brandNames: ['Morphine', 'MS Contin'],
    dosageForms: ['Tab', 'Inj', 'Oral Solution'],
    strengths: ['10mg', '15mg', '30mg', '10mg/mL'],
    category: 'Opioid Analgesic',
    is_s2: true,
    is_controlled: false,
  },

  // ── ANTIBIOTICS ────────────────────────────────────────────────────────────
  {
    genericName: 'Amoxicillin',
    brandNames: ['Amoxil', 'Biomox', 'Trimox'],
    dosageForms: ['Cap', 'Tab', 'Suspension'],
    strengths: ['250mg', '500mg', '875mg', '125mg/5mL', '250mg/5mL'],
    category: 'Antibiotic — Penicillin',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Amoxicillin-Clavulanate (Co-Amoxiclav)',
    brandNames: ['Augmentin', 'Clavulin', 'Amoclav'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['500mg/125mg', '875mg/125mg', '250mg/62.5mg/5mL'],
    category: 'Antibiotic — Penicillin + Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Azithromycin',
    brandNames: ['Zithromax', 'Azithrocin', 'Azibiot'],
    dosageForms: ['Tab', 'Cap', 'Suspension'],
    strengths: ['250mg', '500mg', '200mg/5mL'],
    category: 'Antibiotic — Macrolide',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Clarithromycin',
    brandNames: ['Biaxin', 'Claricid'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['250mg', '500mg'],
    category: 'Antibiotic — Macrolide',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Cefalexin (Cephalexin)',
    brandNames: ['Keflex', 'Cepol', 'Cecef'],
    dosageForms: ['Cap', 'Suspension'],
    strengths: ['250mg', '500mg', '125mg/5mL'],
    category: 'Antibiotic — Cephalosporin',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Ciprofloxacin',
    brandNames: ['Ciprobay', 'Ciproxin', 'Cipro'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['250mg', '500mg', '750mg', '200mg/100mL'],
    category: 'Antibiotic — Fluoroquinolone',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Levofloxacin',
    brandNames: ['Levaquin', 'Tavanic'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['500mg', '750mg'],
    category: 'Antibiotic — Fluoroquinolone',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Doxycycline',
    brandNames: ['Vibramycin', 'Doxylin'],
    dosageForms: ['Cap'],
    strengths: ['100mg'],
    category: 'Antibiotic — Tetracycline',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Metronidazole',
    brandNames: ['Flagyl', 'Metrozine'],
    dosageForms: ['Tab', 'Suspension', 'Inj'],
    strengths: ['250mg', '500mg', '200mg/5mL'],
    category: 'Antibiotic — Nitroimidazole',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Trimethoprim-Sulfamethoxazole (Co-trimoxazole)',
    brandNames: ['Bactrim', 'Cotrimol', 'Septrin'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['80mg/400mg', '160mg/800mg', '40mg/200mg per 5mL'],
    category: 'Antibiotic — Sulfonamide',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Clindamycin',
    brandNames: ['Cleocin', 'Clinimycin'],
    dosageForms: ['Cap', 'Inj'],
    strengths: ['150mg', '300mg'],
    category: 'Antibiotic — Lincosamide',
    is_s2: false,
    is_controlled: false,
  },

  // ── ANTIHYPERTENSIVES ──────────────────────────────────────────────────────
  {
    genericName: 'Amlodipine',
    brandNames: ['Norvasc', 'Amlodin', 'Tenox'],
    dosageForms: ['Tab'],
    strengths: ['5mg', '10mg'],
    category: 'Antihypertensive — CCB',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Losartan',
    brandNames: ['Cozaar', 'Lifezar', 'Losartan PCSO'],
    dosageForms: ['Tab'],
    strengths: ['25mg', '50mg', '100mg'],
    category: 'Antihypertensive — ARB',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Enalapril',
    brandNames: ['Vasotec', 'Renitec'],
    dosageForms: ['Tab'],
    strengths: ['5mg', '10mg', '20mg'],
    category: 'Antihypertensive — ACE Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Metoprolol',
    brandNames: ['Lopressor', 'Toprol-XL', 'Betaloc'],
    dosageForms: ['Tab'],
    strengths: ['25mg', '50mg', '100mg'],
    category: 'Antihypertensive — Beta Blocker',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Carvedilol',
    brandNames: ['Coreg', 'Dilatrend'],
    dosageForms: ['Tab'],
    strengths: ['3.125mg', '6.25mg', '12.5mg', '25mg'],
    category: 'Antihypertensive — Alpha-Beta Blocker',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Hydrochlorothiazide',
    brandNames: ['HCTZ', 'HydroDIURIL'],
    dosageForms: ['Tab'],
    strengths: ['12.5mg', '25mg', '50mg'],
    category: 'Antihypertensive — Diuretic',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Furosemide',
    brandNames: ['Lasix', 'Disal'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['20mg', '40mg', '80mg', '10mg/mL'],
    category: 'Diuretic — Loop',
    is_s2: false,
    is_controlled: false,
  },

  // ── STATINS / LIPID-LOWERING ───────────────────────────────────────────────
  {
    genericName: 'Atorvastatin',
    brandNames: ['Lipitor', 'Torvastat', 'Trovax'],
    dosageForms: ['Tab'],
    strengths: ['10mg', '20mg', '40mg', '80mg'],
    category: 'Statin — HMG-CoA Reductase Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Simvastatin',
    brandNames: ['Zocor', 'Simvatin'],
    dosageForms: ['Tab'],
    strengths: ['10mg', '20mg', '40mg'],
    category: 'Statin — HMG-CoA Reductase Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Rosuvastatin',
    brandNames: ['Crestor', 'Rosuvast'],
    dosageForms: ['Tab'],
    strengths: ['5mg', '10mg', '20mg', '40mg'],
    category: 'Statin — HMG-CoA Reductase Inhibitor',
    is_s2: false,
    is_controlled: false,
  },

  // ── ANTIDIABETICS ──────────────────────────────────────────────────────────
  {
    genericName: 'Metformin',
    brandNames: ['Glucophage', 'Neoformin', 'Diabex'],
    dosageForms: ['Tab'],
    strengths: ['500mg', '850mg', '1000mg'],
    category: 'Antidiabetic — Biguanide',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Glimepiride',
    brandNames: ['Amaryl', 'Glimepiride BE'],
    dosageForms: ['Tab'],
    strengths: ['1mg', '2mg', '3mg', '4mg'],
    category: 'Antidiabetic — Sulfonylurea',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Sitagliptin',
    brandNames: ['Januvia'],
    dosageForms: ['Tab'],
    strengths: ['25mg', '50mg', '100mg'],
    category: 'Antidiabetic — DPP-4 Inhibitor',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Insulin (Regular)',
    brandNames: ['Humulin R', 'Actrapid', 'Novolinase'],
    dosageForms: ['Inj'],
    strengths: ['100 IU/mL'],
    category: 'Antidiabetic — Insulin',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Insulin Glargine',
    brandNames: ['Lantus', 'Toujeo'],
    dosageForms: ['Inj'],
    strengths: ['100 IU/mL', '300 IU/mL'],
    category: 'Antidiabetic — Long-Acting Insulin',
    is_s2: false,
    is_controlled: false,
  },

  // ── ANTIHISTAMINES / ALLERGY ───────────────────────────────────────────────
  {
    genericName: 'Cetirizine',
    brandNames: ['Zyrtec', 'Cetilert', 'Incidal'],
    dosageForms: ['Tab', 'Syrup'],
    strengths: ['10mg', '5mg/5mL'],
    category: 'Antihistamine — 2nd Generation',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Loratadine',
    brandNames: ['Claritin', 'Clarinase', 'Allerta'],
    dosageForms: ['Tab', 'Syrup'],
    strengths: ['10mg', '5mg/5mL'],
    category: 'Antihistamine — 2nd Generation',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Diphenhydramine',
    brandNames: ['Benadryl', 'Benadry Itch'],
    dosageForms: ['Cap', 'Syrup', 'Inj'],
    strengths: ['25mg', '50mg', '12.5mg/5mL'],
    category: 'Antihistamine — 1st Generation',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Fexofenadine',
    brandNames: ['Allegra', 'Fexo'],
    dosageForms: ['Tab'],
    strengths: ['60mg', '120mg', '180mg'],
    category: 'Antihistamine — 2nd Generation',
    is_s2: false,
    is_controlled: false,
  },

  // ── GI MEDICATIONS ─────────────────────────────────────────────────────────
  {
    genericName: 'Omeprazole',
    brandNames: ['Losec', 'Omepron', 'Promtop'],
    dosageForms: ['Cap', 'Inj'],
    strengths: ['20mg', '40mg'],
    category: 'GI — PPI',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Pantoprazole',
    brandNames: ['Protonix', 'Pantoloc', 'Pantogastrin'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['20mg', '40mg'],
    category: 'GI — PPI',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Esomeprazole',
    brandNames: ['Nexium'],
    dosageForms: ['Cap', 'Inj'],
    strengths: ['20mg', '40mg'],
    category: 'GI — PPI',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Domperidone',
    brandNames: ['Motilium', 'Motinum'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['10mg', '1mg/mL'],
    category: 'GI — Prokinetic',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Metoclopramide',
    brandNames: ['Plasil', 'Maxolon'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['10mg', '5mg/mL'],
    category: 'GI — Prokinetic / Antiemetic',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Loperamide',
    brandNames: ['Imodium', 'Diatabs'],
    dosageForms: ['Cap', 'Tab'],
    strengths: ['2mg'],
    category: 'GI — Antidiarrheal',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Lactulose',
    brandNames: ['Duphalac', 'Lactulose PH'],
    dosageForms: ['Solution'],
    strengths: ['10g/15mL'],
    category: 'GI — Laxative',
    is_s2: false,
    is_controlled: false,
  },

  // ── RESPIRATORY ────────────────────────────────────────────────────────────
  {
    genericName: 'Salbutamol (Albuterol)',
    brandNames: ['Ventolin', 'Proventil', 'Asthalin'],
    dosageForms: ['Inhaler (MDI)', 'Nebule', 'Tab', 'Syrup'],
    strengths: ['100mcg/puff', '2.5mg/2.5mL', '2mg', '4mg', '2mg/5mL'],
    category: 'Respiratory — SABA Bronchodilator',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Budesonide',
    brandNames: ['Pulmicort', 'Rhinocort'],
    dosageForms: ['Inhaler', 'Nebule', 'Nasal Spray'],
    strengths: ['200mcg/puff', '0.5mg/2mL', '100mcg/spray'],
    category: 'Respiratory — ICS',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Budesonide/Formoterol',
    brandNames: ['Symbicort', 'Forair'],
    dosageForms: ['Inhaler (DPI)'],
    strengths: ['80mcg/4.5mcg', '160mcg/4.5mcg'],
    category: 'Respiratory — ICS/LABA',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Fluticasone/Salmeterol',
    brandNames: ['Seretide', 'Advair'],
    dosageForms: ['Inhaler (DPI)'],
    strengths: ['100mcg/50mcg', '250mcg/50mcg', '500mcg/50mcg'],
    category: 'Respiratory — ICS/LABA',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Montelukast',
    brandNames: ['Singulair', 'Montiget'],
    dosageForms: ['Tab', 'Chewable', 'Granules'],
    strengths: ['4mg', '5mg', '10mg'],
    category: 'Respiratory — Leukotriene Antagonist',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Guaifenesin',
    brandNames: ['Robitussin', 'Mucosolvan'],
    dosageForms: ['Syrup', 'Tab', 'Capsule'],
    strengths: ['100mg/5mL', '200mg', '400mg'],
    category: 'Respiratory — Expectorant',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Dextromethorphan',
    brandNames: ['Romilar', 'DM Cough'],
    dosageForms: ['Syrup', 'Cap'],
    strengths: ['10mg/5mL', '30mg'],
    category: 'Respiratory — Antitussive',
    is_s2: false,
    is_controlled: false,
  },

  // ── CNS / NEUROLOGICAL ─────────────────────────────────────────────────────
  {
    genericName: 'Betahistine',
    brandNames: ['Serc', 'Menirium'],
    dosageForms: ['Tab'],
    strengths: ['8mg', '16mg', '24mg'],
    category: 'CNS — Antivertigo',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Flunarizine',
    brandNames: ['Sibelium', 'Canacef'],
    dosageForms: ['Cap'],
    strengths: ['5mg'],
    category: 'CNS — Antivertigo / Migraine Prophylaxis',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Diazepam',
    brandNames: ['Valium'],
    dosageForms: ['Tab', 'Inj'],
    strengths: ['2mg', '5mg', '10mg'],
    category: 'CNS — Benzodiazepine',
    is_s2: true,
    is_controlled: false,
  },
  {
    genericName: 'Alprazolam',
    brandNames: ['Xanax', 'Alpra'],
    dosageForms: ['Tab'],
    strengths: ['0.25mg', '0.5mg', '1mg'],
    category: 'CNS — Benzodiazepine (Anxiolytic)',
    is_s2: true,
    is_controlled: true,
  },
  {
    genericName: 'Clonazepam',
    brandNames: ['Rivotril', 'Klonopin'],
    dosageForms: ['Tab'],
    strengths: ['0.5mg', '1mg', '2mg'],
    category: 'CNS — Benzodiazepine (Antiepileptic)',
    is_s2: true,
    is_controlled: true,
  },
  {
    genericName: 'Phenobarbital',
    brandNames: ['Luminal'],
    dosageForms: ['Tab', 'Inj', 'Elixir'],
    strengths: ['15mg', '30mg', '60mg', '100mg', '200mg/mL'],
    category: 'CNS — Barbiturate (Antiepileptic)',
    is_s2: true,
    is_controlled: false,
  },

  // ── VITAMINS / SUPPLEMENTS ─────────────────────────────────────────────────
  {
    genericName: 'Ascorbic Acid (Vitamin C)',
    brandNames: ['Ceelin', 'Enervon-C', 'Fern-C'],
    dosageForms: ['Tab', 'Cap', 'Syrup'],
    strengths: ['250mg', '500mg', '1000mg', '100mg/5mL'],
    category: 'Vitamins & Supplements',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Multivitamins',
    brandNames: ['Enervon', 'Centrum', 'Cherifer', 'Stresstabs'],
    dosageForms: ['Tab', 'Cap', 'Syrup'],
    strengths: ['Standard Formulation'],
    category: 'Vitamins & Supplements',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Vitamin B Complex',
    brandNames: ['Neurobion', 'B-Complex', 'Nervex'],
    dosageForms: ['Tab', 'Cap', 'Inj'],
    strengths: ['Standard Formulation'],
    category: 'Vitamins & Supplements',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Ferrous Sulfate',
    brandNames: ['Iberet', 'Ranferon', 'Sangobion'],
    dosageForms: ['Tab', 'Cap', 'Syrup'],
    strengths: ['300mg', '325mg', '150mg/5mL'],
    category: 'Hematinics',
    is_s2: false,
    is_controlled: false,
  },

  // ── TOPICAL / DERMATOLOGICAL ───────────────────────────────────────────────
  {
    genericName: 'Betamethasone Cream',
    brandNames: ['Betnovate', 'Celestone'],
    dosageForms: ['Cream', 'Ointment'],
    strengths: ['0.1%'],
    category: 'Dermatological — Corticosteroid',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Mupirocin',
    brandNames: ['Bactroban', 'Mupiderm'],
    dosageForms: ['Cream', 'Ointment'],
    strengths: ['2%'],
    category: 'Topical Antibiotic',
    is_s2: false,
    is_controlled: false,
  },

  // ── ANTIPARASITIC ──────────────────────────────────────────────────────────
  {
    genericName: 'Albendazole',
    brandNames: ['Zentel', 'Alworm'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['200mg', '400mg', '200mg/5mL'],
    category: 'Antiparasitic — Anthelmintic',
    is_s2: false,
    is_controlled: false,
  },
  {
    genericName: 'Mebendazole',
    brandNames: ['Vermox', 'Antiox'],
    dosageForms: ['Tab', 'Suspension'],
    strengths: ['100mg', '500mg', '100mg/5mL'],
    category: 'Antiparasitic — Anthelmintic',
    is_s2: false,
    is_controlled: false,
  },
];

/**
 * Search the Philippine formulary by drug name or brand name.
 * Returns up to `limit` results, with S2 drugs ordered last (for safety awareness).
 */
export function searchFormulary(query: string, limit = 10): PhDrug[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = PH_FORMULARY.filter(
    (d) =>
      d.genericName.toLowerCase().includes(q) ||
      d.brandNames.some((b) => b.toLowerCase().includes(q)) ||
      d.category.toLowerCase().includes(q)
  );
  // S2 drugs shown last so non-controlled options appear first
  const sorted = [
    ...results.filter((d) => !d.is_s2),
    ...results.filter((d) => d.is_s2),
  ];
  return sorted.slice(0, limit);
}
