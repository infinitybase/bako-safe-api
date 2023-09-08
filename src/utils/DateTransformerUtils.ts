const dateTransformer = {
  from(value: string) {
    return value ? new Date(value) : value;
  },
  to(value: Date) {
    if (value && value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
};

export default dateTransformer;
