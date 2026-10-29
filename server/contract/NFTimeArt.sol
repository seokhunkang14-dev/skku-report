// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFTime Art (KIP-17 / ERC-721 compatible)
/// @notice 서버의 민터 계정(owner)만 발행 가능. 원화 결제 확인 후 구매자 지갑으로 직접 민팅.
contract NFTimeArt is ERC721, Ownable {
    uint256 public totalMinted;
    string private _base;

    event ArtMinted(address indexed to, uint256 indexed tokenId, uint256 indexed workId);

    constructor(string memory baseURI_) ERC721("NFTime Art", "NFTIME") Ownable(msg.sender) {
        _base = baseURI_;
    }

    function mint(address to, uint256 workId) external onlyOwner returns (uint256 tokenId) {
        tokenId = ++totalMinted;
        _safeMint(to, tokenId);
        emit ArtMinted(to, tokenId, workId);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _base = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }
}
