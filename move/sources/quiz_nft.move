module quiz_nft::quiz_nft;

use std::string::String;
use sui::event;
use sui::table::{Self, Table};

const E_ALREADY_SUBMITTED: u64 = 1;
const E_WRONG_LENGTH: u64 = 2;
const E_ALREADY_MINTED: u64 = 3;
const E_NOT_PERFECT_SCORE: u64 = 4;

const ANSWER_LEN: u64 = 5;

public struct HostCap has key, store {
    id: UID,
}

public struct Quiz has key {
    id: UID,
    answer_key: vector<u8>,
    submitted: Table<address, u8>,
    minted: Table<address, bool>,
    accepted_count: u64,
}

public struct CutCreatureNFT has key, store {
    id: UID,
    name: String,
    image_url: String,
    score: u8,
    minted_at_epoch: u64,
}

public struct SubmissionRecorded has copy, drop {
    participant: address,
    name: String,
    score: u8,
}

public struct SubmissionAccepted has copy, drop {
    participant: address,
    name: String,
    score: u8,
}

public struct NftMinted has copy, drop {
    participant: address,
    nft_id: ID,
    name: String,
    score: u8,
}

fun init(ctx: &mut TxContext) {
    let cap = HostCap { id: object::new(ctx) };
    transfer::public_transfer(cap, ctx.sender());
}

#[test_only]
public fun test_init(ctx: &mut TxContext) {
    init(ctx);
}

public entry fun create_quiz(
    _cap: &HostCap,
    answer_key: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(answer_key.length() == ANSWER_LEN, E_WRONG_LENGTH);
    let quiz = Quiz {
        id: object::new(ctx),
        answer_key,
        submitted: table::new(ctx),
        minted: table::new(ctx),
        accepted_count: 0,
    };
    transfer::share_object(quiz);
}

public entry fun submit(
    quiz: &mut Quiz,
    name: String,
    answers: vector<u8>,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    assert!(!quiz.submitted.contains(sender), E_ALREADY_SUBMITTED);
    assert!(answers.length() == ANSWER_LEN, E_WRONG_LENGTH);

    let score = score_answers(&quiz.answer_key, &answers);
    quiz.submitted.add(sender, score);

    event::emit(SubmissionRecorded { participant: sender, name, score });

    if (score == (ANSWER_LEN as u8)) {
        quiz.accepted_count = quiz.accepted_count + 1;
        event::emit(SubmissionAccepted { participant: sender, name, score });
    };
}

public entry fun mint_nft(
    _cap: &HostCap,
    quiz: &mut Quiz,
    recipient: address,
    name: String,
    image_url: String,
    ctx: &mut TxContext,
) {
    assert!(quiz.submitted.contains(recipient), E_NOT_PERFECT_SCORE);
    let score = *quiz.submitted.borrow(recipient);
    assert!(score == (ANSWER_LEN as u8), E_NOT_PERFECT_SCORE);
    assert!(!quiz.minted.contains(recipient), E_ALREADY_MINTED);

    quiz.minted.add(recipient, true);

    let nft = CutCreatureNFT {
        id: object::new(ctx),
        name,
        image_url,
        score,
        minted_at_epoch: ctx.epoch(),
    };
    let nft_id = object::id(&nft);

    event::emit(NftMinted {
        participant: recipient,
        nft_id,
        name: nft.name,
        score,
    });

    transfer::public_transfer(nft, recipient);
}

fun score_answers(key: &vector<u8>, ans: &vector<u8>): u8 {
    let mut i = 0;
    let mut score: u8 = 0;
    while (i < ANSWER_LEN) {
        if (*key.borrow(i) == *ans.borrow(i)) {
            score = score + 1;
        };
        i = i + 1;
    };
    score
}
