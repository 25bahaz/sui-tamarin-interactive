#[test_only]
module quiz_nft::quiz_nft_tests;

use quiz_nft::quiz_nft::{Self, HostCap, Quiz, CutCreatureNFT};
use sui::test_scenario as ts;

const HOST: address = @0xA11CE;
const ALICE: address = @0xB0B;

fun setup_quiz(scenario: &mut ts::Scenario) {
    ts::next_tx(scenario, HOST);
    {
        quiz_nft::test_init(ts::ctx(scenario));
    };
    ts::next_tx(scenario, HOST);
    {
        let cap = ts::take_from_sender<HostCap>(scenario);
        quiz_nft::create_quiz(&cap, vector[0u8, 1u8, 2u8, 3u8, 0u8], ts::ctx(scenario));
        ts::return_to_sender(scenario, cap);
    };
}

#[test]
fun perfect_score_emits_accepted_and_allows_mint() {
    let mut scenario = ts::begin(HOST);
    setup_quiz(&mut scenario);

    ts::next_tx(&mut scenario, ALICE);
    {
        let mut quiz = ts::take_shared<Quiz>(&scenario);
        quiz_nft::submit(
            &mut quiz,
            std::string::utf8(b"alice"),
            vector[0u8, 1u8, 2u8, 3u8, 0u8],
            ts::ctx(&mut scenario),
        );
        ts::return_shared(quiz);
    };

    ts::next_tx(&mut scenario, HOST);
    {
        let cap = ts::take_from_sender<HostCap>(&scenario);
        let mut quiz = ts::take_shared<Quiz>(&scenario);
        quiz_nft::mint_nft(
            &cap,
            &mut quiz,
            ALICE,
            std::string::utf8(b"alice"),
            std::string::utf8(b"https://example.com/cut.png"),
            ts::ctx(&mut scenario),
        );
        ts::return_shared(quiz);
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ALICE);
    {
        let nft = ts::take_from_sender<CutCreatureNFT>(&scenario);
        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1, location = quiz_nft::quiz_nft)]
fun double_submit_aborts() {
    let mut scenario = ts::begin(HOST);
    setup_quiz(&mut scenario);

    ts::next_tx(&mut scenario, ALICE);
    {
        let mut quiz = ts::take_shared<Quiz>(&scenario);
        quiz_nft::submit(
            &mut quiz,
            std::string::utf8(b"alice"),
            vector[0u8, 1u8, 2u8, 3u8, 0u8],
            ts::ctx(&mut scenario),
        );
        ts::return_shared(quiz);
    };

    ts::next_tx(&mut scenario, ALICE);
    {
        let mut quiz = ts::take_shared<Quiz>(&scenario);
        quiz_nft::submit(
            &mut quiz,
            std::string::utf8(b"alice2"),
            vector[1u8, 1u8, 1u8, 1u8, 1u8],
            ts::ctx(&mut scenario),
        );
        ts::return_shared(quiz);
    };

    ts::end(scenario);
}
