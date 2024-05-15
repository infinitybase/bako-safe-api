const generatePredicateVersionName = (code: string) => {
  const prefix = 'bako_safe';
  const suffix = code.slice(-5);

  const predicateVersionName = `${prefix}_${suffix}`;

  return predicateVersionName;
};

export { generatePredicateVersionName };
