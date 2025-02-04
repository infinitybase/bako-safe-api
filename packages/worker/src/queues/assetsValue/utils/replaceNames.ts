export const parseName = (name: string) => {
  const _name = name.toLowerCase();

  const fromTo: Record<string, string> = {
    usdc: "usd-coin",
    usdf: "usd-coin", // usdf -> token fuel fluid
    weeth: "bridged-weeth-linea",
    wbeth: "wrapped-beacon-eth",
    "manta mbtc": "manta-mbtc",
    "manta meth": "manta-meth",
    "manta musd": "manta-musd",
    solvbtc: "solv-btc",
    "solvbtc.bbn": "solv-protocol-solvbtc-bbn",
    susde: "ethena-staked-usde",
    wsteth: "wrapped-steth",
    pzeth: "renzo-restaked-lst",
    steaklrt: "steakhouse-resteaking-vault",
    "mantle meth": "mantle-staked-ether",
    ezeth: "renzo-restaked-eth",
    usdt: "tether",
    sdai: "savings-dai",
    fbtc: "ignition-fbtc",
    rseth: "kelp-dao-restaked-eth",
  };

  return fromTo[_name] ?? _name;
};
