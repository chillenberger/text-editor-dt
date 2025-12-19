import { RecursiveChunker } from '@chonkiejs/core';

// Create a chunker
const chunker = await RecursiveChunker.create({
  chunkSize: 512
});

// Chunk your text
const chunks = await chunker.chunk(`Big Pharma’s AI race extends across drug discovery, development, and clinical trials—but AstraZeneca has distinguished itself by deploying AI clinical trials technology at an unprecedented public health scale. 

While competitors optimise internal R&D pipelines, AstraZeneca’s AI is already embedded in national healthcare systems, screening hundreds of thousands of patients and demonstrating what happens when AI moves from pharmaceutical labs into actual patient care.

The clinical validation backs this approach. AstraZeneca’s CREATE study, presented at the European Lung Cancer Congress in March 2025, demonstrated a 54.1% positive predictive value for its AI chest X-ray tool—far exceeding the pre-defined success threshold of 20%. 

Behind those numbers: over 660,000 people screened in Thailand since 2022, with AI detecting suspected pulmonary lesions in 8% of cases. More critically, Thailand’s National Health Security Office is now scaling this technology across 887 hospitals with a three-year budget exceeding 415 million baht.

This isn’t just a pilot program or proof-of-concept. It’s AI clinical trials technology deployed at the national healthcare system scale.

The strategic divergence in AI clinical trials approaches
The contrast with competitors is revealing. Pfizer’s ML Research Hub has compressed drug discovery timelines to approximately 30 days for molecule identification. The company used AI to develop Paxlovid in record time, with machine learning analysing patient data 50% faster than traditional methods. Pfizer now deploys AI in over half its clinical trials.

Novartis partnered with Nobel Prize winner Demis Hassabis’s Isomorphic Labs and Microsoft for “AI-driven drug discovery.” Its Intelligent Decision System uses computational twins to simulate clinical trial processes, with AI-identified sites reportedly recruiting patients faster than traditional selection methods.

Roche’s “lab in a loop” strategy iterates AI models with laboratory experiments. Having acquired Foundation Medicine and Flatiron Health, Roche built the industry’s largest clinical genomic database—over 800,000 genomic profiles across 150+ tumour subtypes—targeting 50% efficiency gains in safety management by 2026.

AstraZeneca’s clinical operations advantage
What sets AstraZeneca apart in AI clinical trials isn’t just ambition—it’s execution at scale. The company runs over 240 global trials in its R&D pipeline and has systematically embedded generative AI across clinical operations. 

It’s an “intelligent protocol tool,” developed with medical writers, that has reduced document authoring time by 85% in some cases. The company uses AI for 3D location detection on CT scans, slashing the time radiologists spend on manual annotation.

More significantly, AstraZeneca is pioneering virtual control groups for AI clinical trials using electronic health records and past trial data to simulate placebo arms—potentially reducing the number of patients receiving non-active treatments. This represents a fundamental rethinking of clinical trial design itself.

The lung cancer screening program exemplifies this strategic focus. Using Qure.ai’s qXR-LNMS tool, AstraZeneca isn’t just conducting trials—it’s transforming public health infrastructure. The December 2025 expansion includes a new industrial worker screening program targeting 5,000 workers across four Thai provinces, now expanding beyond lung cancer to include heart failure detection.

The timeline acceleration race
Industry metrics show why AI clinical trials matter: Traditional drug development takes 10-15 years with a 90% failure rate. AI-discovered drugs achieve 80-90% Phase I success rates—double the 40-65% traditional benchmark. Over 3,000 AI-assisted drugs are in development, with 200+ AI-enabled approvals expected by 2030.

Pfizer moves from molecule identification to clinical trials in six-week cycles. Novartis analyses 460,000 clinical trials in minutes versus months. Yet AstraZeneca’s model delivers immediate patient impact—detecting cancers today in underserved populations, often before symptoms appear.

The US$410 Billion question
The World Economic Forum projects AI could generate US$350-$410 billion annually for pharma by 2030. The question is which approach captures more value: faster drug discovery or more efficient clinical operations?

Pfizer’s bet on computational drug design and Novartis’s AI-powered trial site selection may yield breakthrough molecules. Roche’s integrated pharma-diagnostics model creates a proprietary data moat. 

But AstraZeneca’s strategy of embedding AI clinical trials throughout operations—from protocol generation to patient recruitment to regulatory submissions—is demonstrably reducing time-to-market while building real-world evidence at scale.

The company’s partnership approach is equally distinctive. While others acquire AI companies or build internal hubs, AstraZeneca collaborates with technology partners like Qure.ai and Perceptra, regulatory bodies, and national health systems to deploy AI clinical trials where infrastructure gaps exist.

As AstraZeneca pursues its 2030 goal of delivering 20 new medicines and reaching us$80 billion in revenue, its AI clinical trials advantage isn’t just about speed—it’s about proving AI’s value in the most regulated, risk-averse phase of pharmaceutical development. While competitors race to discover the next breakthrough molecule, AstraZeneca is reengineering how clinical trials themselves are conducted.

The winner may not be determined by who builds the most sophisticated algorithm, but by who deploys AI clinical trials technology where it demonstrably improves patient outcomes—at scale, under regulatory scrutiny, and within real healthcare systems.

And in that race, AstraZeneca currently leads.

(Photo by AstraZeneca)

See also: Google AMIE: AI doctor learns to ‘see’ medical images

Want to learn more about AI and big data from industry leaders? Check out AI & Big Data Expo taking place in Amsterdam, California, and London. The comprehensive event is part of TechEx and is co-located with other leading technology events, click here for more information.

AI News is powered by TechForge Media. Explore other upcoming enterprise technology events and webinars here.`);

// Use the chunks
for (const chunk of chunks) {
  console.dir(chunk, {depth: null});
  console.log(`Tokens: ${chunk.tokenCount}`);
}