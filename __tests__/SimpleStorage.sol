// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract SimpleStorage {

  mapping(uint256 => string) private entries;
  
  event PutValue(uint256 _loc, string _value);
  
  function
  put (uint256 _loc, string memory _value)
  public
  {
    entries[_loc] = _value;
    emit PutValue(_loc, _value);
  }
  
  function
  get (uint256 _loc)
  public
  view
  returns (string memory)
  {
    return entries[_loc];
  }
}
