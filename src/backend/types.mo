module {
    public type NFT = {
        id: Nat;
        owner: Principal;
        metadata: Text;
    };

    public type StakedNFT = {
        nft: NFT;
        stakedAt: Int;
        rewards: Nat;
    };

    public type User = {
        principal: Principal;
        stakedNFTs: [StakedNFT];
        totalRewards: Nat;
    };
}