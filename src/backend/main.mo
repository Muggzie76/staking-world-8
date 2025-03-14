import Types "types";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Result "mo:base/Result";
import Error "mo:base/Error";

actor NFTStaking {
    type NFT = Types.NFT;
    type StakedNFT = Types.StakedNFT;
    type User = Types.User;

    // Store NFTs by their ID
    private stable var nftEntries : [(Nat, NFT)] = [];
    private var nfts = HashMap.HashMap<Nat, NFT>(0, Nat.equal, Nat.hash);

    // Store users by their principal
    private stable var userEntries : [(Principal, User)] = [];
    private var users = HashMap.HashMap<Principal, User>(0, Principal.equal, Principal.hash);

    // Constants
    private let REWARD_RATE : Nat = 1; // Rewards per hour
    private let MIN_STAKE_TIME : Int = 3600000000000; // 1 hour in nanoseconds

    system func preupgrade() {
        nftEntries := Iter.toArray(nfts.entries());
        userEntries := Iter.toArray(users.entries());
    };

    system func postupgrade() {
        nfts := HashMap.fromIter<Nat, NFT>(nftEntries.vals(), 0, Nat.equal, Nat.hash);
        users := HashMap.fromIter<Principal, User>(userEntries.vals(), 0, Principal.equal, Principal.hash);
    };

    // Create a new NFT
    public shared(msg) func createNFT(metadata: Text) : async Result.Result<NFT, Text> {
        let caller = msg.caller;
        let id = nfts.size() + 1;
        
        let nft : NFT = {
            id = id;
            owner = caller;
            metadata = metadata;
        };

        nfts.put(id, nft);
        return #ok(nft);
    };

    // Stake an NFT
    public shared(msg) func stakeNFT(nftId: Nat) : async Result.Result<StakedNFT, Text> {
        let caller = msg.caller;
        
        switch (nfts.get(nftId)) {
            case null { return #err("NFT not found"); };
            case (?nft) {
                if (nft.owner != caller) {
                    return #err("You don't own this NFT");
                };

                let stakedNFT : StakedNFT = {
                    nft = nft;
                    stakedAt = Time.now();
                    rewards = 0;
                };

                switch (users.get(caller)) {
                    case null {
                        let newUser : User = {
                            principal = caller;
                            stakedNFTs = [stakedNFT];
                            totalRewards = 0;
                        };
                        users.put(caller, newUser);
                    };
                    case (?user) {
                        let newStakedNFTs = Array.append<StakedNFT>(user.stakedNFTs, [stakedNFT]);
                        let updatedUser : User = {
                            principal = user.principal;
                            stakedNFTs = newStakedNFTs;
                            totalRewards = user.totalRewards;
                        };
                        users.put(caller, updatedUser);
                    };
                };

                return #ok(stakedNFT);
            };
        };
    };

    // Calculate rewards for a staked NFT
    private func calculateRewards(stakedAt: Int) : Nat {
        let now = Time.now();
        let timeStaked = now - stakedAt;
        
        if (timeStaked < MIN_STAKE_TIME) {
            return 0;
        };

        let hoursStaked = Int.abs(timeStaked / 3600000000000);
        return hoursStaked * REWARD_RATE;
    };

    // Get user's staked NFTs and rewards
    public query(msg) func getUserStakes() : async Result.Result<User, Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case null { return #err("User not found"); };
            case (?user) { return #ok(user); };
        };
    };

    // Unstake an NFT
    public shared(msg) func unstakeNFT(nftId: Nat) : async Result.Result<Nat, Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case null { return #err("User not found"); };
            case (?user) {
                let (stakedNFT, remaining) = Array.partition<StakedNFT>(
                    user.stakedNFTs,
                    func (s: StakedNFT) : Bool { s.nft.id == nftId }
                );

                switch (stakedNFT.size()) {
                    case 0 { return #err("NFT not found in staked NFTs"); };
                    case _ {
                        let rewards = calculateRewards(stakedNFT[0].stakedAt);
                        let updatedUser : User = {
                            principal = user.principal;
                            stakedNFTs = remaining;
                            totalRewards = user.totalRewards + rewards;
                        };
                        users.put(caller, updatedUser);
                        return #ok(rewards);
                    };
                };
            };
        };
    };

    // Claim rewards
    public shared(msg) func claimRewards() : async Result.Result<Nat, Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case null { return #err("User not found"); };
            case (?user) {
                if (user.totalRewards == 0) {
                    return #err("No rewards to claim");
                };

                let rewards = user.totalRewards;
                let updatedUser : User = {
                    principal = user.principal;
                    stakedNFTs = user.stakedNFTs;
                    totalRewards = 0;
                };
                users.put(caller, updatedUser);
                return #ok(rewards);
            };
        };
    };
}