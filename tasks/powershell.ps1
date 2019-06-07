<#
.SYNOPSIS
    Get Vault key/value pairs from kv engine

.DESCRIPTION 

.EXAMPLE
    ./ado-vault.ps1
#>

[CmdletBinding()]
param()

try {

    Get-ChildItem -Path "$PSScriptRoot\ps_modules" -Recurse -Include *.psd1 | Import-Module

    Trace-VstsEnteringInvocation $MyInvocation

    ############################################################################
    # Get all inputs for the tasks
    ############################################################################
    #$ResourceGroupName = Get-VstsInput -Name "ResourceGroupName"
    [string]$Uri = Get-VstsInput -Name "Uri" -Require -ErrorAction Stop
    [string]$Token = Get-VstsInput -Name "Token" -Require -ErrorAction Stop
    [string]$EngineName = Get-VstsInput -Name "EngineName" -Requires -ErrorAction Stop
    [string]$EngineVersion = Get-VstsInput -Name "EngineVersion" -ErrorAction Stop
    [string]$Path = Get-VstsInput -name "Path" -ErrorAction Stop
    [bool]$AddVariablePrefix = Get-VstsInput -Name "AddVariablePrefix" -AsBool -ErrorAction Stop
    [string]$VariablePrefix = Get-VstsInput -name "VariablePrefix" -ErrorAction Stop
    ############################################################################


    ############################################################################
    # Show Input Values
    ############################################################################
    Write-Host "Uri: .................................. [$Uri]"
    Write-Host "Token: ................................ [$Token]"
    Write-Host "Engine Name: .......................... [$EngineName]"
    Write-Host "Engine Version: ....................... [$EngineVersion]"
    Write-Host "Path: ................................. [$Path]"
    Write-Host "Add Prefix: ........................... [$AddVariablePrefix]"
    Write-Host "Variable Prefix: ...................... [$VariablePrefix]"
    ############################################################################


    ############################################################################
    # START : Work Flow
    ############################################################################
    Write-Verbose "Starting Work Flow..."

    $VaultTokenHeaderKey = "X-Vault-Token";
    $Uri = "$Uri/v1"

    $VaultHeaders = @{ $VaultTokenHeaderKey = $VAULT_TOKEN }
    $uriPath = "{0}/{1}/{2}" -f $Uri, $EngineName, $Path

    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12

    $result = Invoke-RestMethod -Headers $VaultHeaders -Uri $uriPath
    $CreatedVariables = ""

    if ($result) {
        Write-Verbose "Result exists"
        if ($result.GetType().Name -eq 'PSCustomObject') {
            Write-Verbose "Result type is custom psobject"
            if ($result | Get-Member -Name data) {
                Write-Verbose "Result has data element"
                $data = $result | Select-Object -ExpandProperty data
                if ($data) {
                    Write-Verbose "Data exists"
                    $data.psobject.Members | Where-Object { $_.Membertype -ieq "noteproperty" } | 
                    ForEach-Object { 
                        #Write-Verbose $_
                
                        Write-Verbose $_.Name
                        $Name = $_.Name.ToUpper()
                        if ($AddVariablePrefix) {
                            $Name = "{0}_{1}" -f $VariablePrefix, $Name
                        }
                        $Value = $_.Value

                        Write-Output "##vso[task.setvariable variable=$Name]$Value"
                        $CreatedVariables += "`$($Name)`n"
                    }
                }
            }
        }
    }
    else {
        Write-Error "No data retrieved"
    }

    if (-not([System.String]::IsNullOrWhiteSpace($CreatedVariables))) {
        Write-Host "`nAvailable Variables:`r`n$CreatedVariables"
    }


    Write-Verbose "End Work Flow"

    ############################################################################
    # END : Work Flow
    ############################################################################




}
catch {
    Write-Output "Exception: [$($_.Exception.Message.ToString())]"
}
finally {

    Trace-VstsLeavingInvocation $MyInvocation
}