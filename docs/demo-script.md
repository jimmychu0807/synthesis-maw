1: Maw.finance is an intent compiler that takes your plain text strategy and launches an agent that autonomously maintains your portfolio.

2: Have you ever used Uniswap, CowSwap, Aerodrome, Coinbase, or Odos? Now imagine being able to use all of those in tandem with a private agent that understands your strategy.

3: (FLUFF) In here we’ll be using Venice to keep your strategy private, Metamask’s Smart Account Kit to allow the agent to spend without wrecking you, ERC-8004 for judging and scoring the agent, and Uniswap for trading and portfolio balancing.

4: (FLUFF) I’ll go more in depth when they come up in the demo.

5: To spin up an agent, all you have to do is sign in with Metamask Flask, and describe how you want to balance your portfolio.

5.5: When you submit, we’ll use Venice.ai to analyze your strategy and produce a report describing how your portfolio will be managed.

6: Venice.ai supports end to end encryption and TEE on the uncensored model we're using, so your plaintext strategy never leaks to the big bad in corporate AI.

7: If the report aligns with your requirements, you can use Metamask delegations to sign off on a specific amount from your portfolio that the agent is allowed to manage.

7.5: Before every trade, the agent checks how much delegation budget is left on-chain for the current 24-hour window.

8: This prevents you from getting rekt if your strategy doesn’t work as you expected.

9: You can also specify logical guardrails in your prompt, like max spend per day or gas limits, which will use Venice.ai for dynamic decision making if complex.

10: (FLUFF) Note, the wallet you sign with will have to be Metamask Flask for the ERC-7715 integration.

11: (FLUFF)  For the judges from Venice, Protocol Labs, and Uniswap who might not have this installed, I’ve pre-created some agents you can review instead.

12: (FLUFF) You can see them under the “Monitor” tab here.

13: Alright, so here’s our agent.

14: It’s currently in its initialization phase.

15: What it’s doing here is generating an image for the Maw Agent with Venice.ai, and then it's registering itself using ERC-8004 and minting its identity NFT.

16: (FLUFF) Currently the agent has the ability to analyze prices, view your balances, dynamically determine if it should or should not trade, and then trades on Uniswap.

17: Alright, so we’re registered, here’s the transactions in Basescan, we’ll look at ERC-8004 scan later.

17.5: Now we just have to wait a minute for the agent to execute…  Let’s fast forward a bit

18: So here we can see the actions the intent compiler came up with for this strategy

19: We fetched the price data from CoinMarketCap, and live liquidity data — TVL, 24-hour volume, fee tiers — from the Uniswap V3 subgraph on The Graph. 

19.5: Then we used Venice to privately analyze our current portfolio, running against their uncensored models that support TEE, to reason on if we should swap or not.

20: The Venice research LLM determined we should rebalance, and then we found the best combination of parameters possible for the swap and used Uniswap Trading API to do so.

20.5: Permit2 lets the agent sign an EIP-712 typed permit instead of sending a separate approval transaction — it's the standard Uniswap uses for gasless approvals.

21: And our portfolio incremented by $100, perfect.

22: These tool calls are dynamic. The agent determined what tools it needed to use during its setup phase, we’re just watching it play out.

22.5: After every swap, we snapshot the full state — portfolio before, portfolio after, the agent's reasoning, market data, execution details. That gets hashed and the hash goes on-chain in the ERC-8004 Validation Registry. 

22.75: A separate Venice judge pulls the snapshot, checks the hash, scores the agent across three dimensions, and posts those scores on-chain too. Anyone can verify the whole chain.


24: We register the agent so its performance is transparently scored and recorded on-chain.

25: In a later version, you’ll be able to confidentially sell your strategy as an out-of-the-box product, which we can do privately with Venice.ai's TEE so we’re building up your agent’s reputation now in preparation for that.

26: I’m going to timelapse the next hour or two so you can see the automatic balancing.

28: (Timelapse)

30: Yep, there we are. All private, all automated.

31: Every agent exposes a full agent_log.jsonl that you can access up here

Just a quick note for sponsors before we close: Nothing presented in this demo was mocked. The activity log has direct links to scanners that you can use to confirm, and you can test the live app at maw.finance

If you don't have Metamask Flask installed, for the demo only, I've made every agent public so you can see them in action without spinning up your own, that's under the "Monitor" tab here

The readme also has a dedicated sponsor section that links to the most relevant code for the Protocol Labs, Venice, Metamask, and Uniswap tracks.

With all that said
31: SEC - CLOSING

32: The future of user interfaces is a chat box, where you describe what you want to do, and leave it to the agents to do it.

33: Maw is a cutting-edge intent compiler that achieves this vision.

34: Venice.ai is used to trustlessly and privately handle tool selection, feedback, and translating your desired strategy into tangible steps.

35: Metamask delegations are used to cordon off a portion of your portfolio to protect you against risk.

36: ERC-8004 provides transparency on your agent’s performance over time and lets you integrate into a2a systems.

37: Uniswap's Trading API, Permit2, and V3 subgraph on The Graph power every trade the agent makes — from liquidity analysis to gasless execution.

38: Try Maw now at maw.finance  Thank you!
