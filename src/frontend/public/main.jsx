import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/nft_staking_backend/index';

const App = () => {
    const [authClient, setAuthClient] = useState(null);
    const [actor, setActor] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userNFTs, setUserNFTs] = useState([]);
    const [stakedNFTs, setStakedNFTs] = useState([]);
    const [rewards, setRewards] = useState(0);

    useEffect(() => {
        initAuth();
    }, []);

    const initAuth = async () => {
        const client = await AuthClient.create();
        setAuthClient(client);

        if (await client.isAuthenticated()) {
            handleAuthenticated(client);
        }
    };

    const handleAuthenticated = async (client) => {
        const identity = await client.getIdentity();
        const agent = new HttpAgent({ identity });
        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: process.env.NFT_STAKING_BACKEND_CANISTER_ID,
        });

        setActor(actor);
        setIsAuthenticated(true);
        await loadUserData(actor);
    };

    const login = async () => {
        await authClient?.login({
            identityProvider: process.env.II_URL,
            onSuccess: () => handleAuthenticated(authClient),
        });
    };

    const logout = async () => {
        await authClient?.logout();
        setIsAuthenticated(false);
        setUserNFTs([]);
        setStakedNFTs([]);
        setRewards(0);
    };

    const loadUserData = async (actor) => {
        try {
            const result = await actor.getUserStakes();
            switch (result.tag) {
                case 'ok':
                    setStakedNFTs(result.val.stakedNFTs);
                    setRewards(result.val.totalRewards);
                    break;
                case 'err':
                    console.error('Error loading user data:', result.val);
                    break;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const stakeNFT = async (nftId) => {
        try {
            const result = await actor.stakeNFT(nftId);
            if (result.tag === 'ok') {
                await loadUserData(actor);
            }
        } catch (error) {
            console.error('Error staking NFT:', error);
        }
    };

    const unstakeNFT = async (nftId) => {
        try {
            const result = await actor.unstakeNFT(nftId);
            if (result.tag === 'ok') {
                await loadUserData(actor);
            }
        } catch (error) {
            console.error('Error unstaking NFT:', error);
        }
    };

    const claimRewards = async () => {
        try {
            const result = await actor.claimRewards();
            if (result.tag === 'ok') {
                await loadUserData(actor);
            }
        } catch (error) {
            console.error('Error claiming rewards:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Staking World 8</h1>
                {!isAuthenticated ? (
                    <button
                        onClick={login}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Connect Wallet
                    </button>
                ) : (
                    <button
                        onClick={logout}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Disconnect
                    </button>
                )}
            </header>

            {isAuthenticated && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold mb-4">Your NFTs</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {userNFTs.map((nft) => (
                                <div key={nft.id} className="bg-gray-700 p-4 rounded-lg">
                                    <p className="font-bold">NFT #{nft.id}</p>
                                    <p className="text-sm text-gray-300">{nft.metadata}</p>
                                    <button
                                        onClick={() => stakeNFT(nft.id)}
                                        className="mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                                    >
                                        Stake
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold mb-4">Staked NFTs</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {stakedNFTs.map((stakedNFT) => (
                                <div key={stakedNFT.nft.id} className="bg-gray-700 p-4 rounded-lg">
                                    <p className="font-bold">NFT #{stakedNFT.nft.id}</p>
                                    <p className="text-sm text-gray-300">{stakedNFT.nft.metadata}</p>
                                    <p className="text-sm text-green-400">Rewards: {stakedNFT.rewards}</p>
                                    <button
                                        onClick={() => unstakeNFT(stakedNFT.nft.id)}
                                        className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                                    >
                                        Unstake
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg col-span-2">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Total Rewards: {rewards}</h2>
                            <button
                                onClick={claimRewards}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                                disabled={rewards === 0}
                            >
                                Claim Rewards
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);