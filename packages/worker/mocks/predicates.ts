const  stg = [
    "0x63403dac4c4b632547c601c40f3c41634afa8b6e34726791eaf2fc12e7e89b75",
    "0x7b7f3264a8ae5503ac51912a1a3f25455449bb39f3fc2ac133e7c6acebd15123",
    "0xf2fbcb235c6d140ac7f763df446e73ad80b5ebe00e79d2e4ed8c5866c576fc31",
    "0x862c3b0f5e8a4cebcb5d972f5c865ef50b50bff27e4d6926291dd0bb1b4b97c7"
  ];
  
const prod = [
        // mainnet
        "0xec8ff99af54e7f4c9dd81f32dffade6b41f3b980436ee2eabf47a069f998cd73",
        // "0x12bc8c902e4bffe7d73eb5d9126def7f0dd46966d6df34512e5acd0ebe1da684",
        // "0x7921769cf0105b0c353e4d1c9162fd1228415b9dc3e2ad3891d18a39fe5696e0",
        // "0xa94e724edf35fe7c5d7eac7de7d871632e3187f02b27ad6d494df0cff5360587",
        // "0xb8b7506e5f1796685ed9737754d2ba7db1a61a8a464194104172e2384dd1ceb4",
        "0x29ccdab6523634479fec5d4eea2c6ab0e9b9249ea3bce11805862078ff413546", // tem bridge nativo da fuel (l3)
        // fuel vault
        "0xf259aa578a90fe2572dc63406029846e29e8b3416c23910b4f56824ed83def2a",
        // error
        "0x001f7f9c67c4eb3873c0f85b360ae5eaff3479d82c8945cd7484e870af25621b",
        "0x01148c6a565f830e01a65160f7da98b6442425eac61ab9a9f9a78e17b5f2189e"
  ];

export const predicates = (env: 'PROD' | 'STG') => {
  const list = env === 'PROD' ? prod : stg;
  console.log(list)
  return list.map((i) => {
    return {predicate_address: i}
  });
}