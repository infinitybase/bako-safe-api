import { format } from 'date-fns';

const generateWitnessesUpdatedAt = () => {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS");
};

export { generateWitnessesUpdatedAt };
