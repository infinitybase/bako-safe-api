const generatePredicateVersionName = (rootAddress: string) => {
  const prefix = 'bako_safe';
  const suffix = rootAddress.slice(-5);

  const predicateVersionName = `${prefix}_${suffix}`;

  return predicateVersionName;
};

export { generatePredicateVersionName };
